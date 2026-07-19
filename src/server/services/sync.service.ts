import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { toMessage, isAppError } from '@/lib/errors';
import { GmailService } from './gmail.service';
import { TemplateMatcher } from './template.service';
import { upsertCompanyForEmail } from '@/server/repositories/company.repository';
import { findExistingMessageIds } from '@/server/repositories/message.repository';
import {
  markSyncStarted,
  markSyncFinished,
  updateSyncProgress,
  getSyncState,
} from '@/server/repositories/sync-state.repository';
import { getSettings } from '@/server/repositories/settings.repository';
import type { ParsedSentEmail } from '@/types';

/**
 * SyncService orchestrates reading the user's SENT mail and persisting the
 * extracted, deduplicated data. It is safe to run repeatedly:
 *   - Full sync scans the entire mailbox (first run).
 *   - Incremental sync only fetches messages newer than the last processed one.
 *   - Already-processed Gmail message ids are skipped, so nothing is reprocessed.
 */
export class SyncService {
  constructor(private readonly userId: string) {}

  /** Entry point used by the worker. Chooses full vs incremental automatically. */
  async run(mode: 'full' | 'incremental' | 'auto' = 'auto'): Promise<{ processed: number }> {
    const state = await getSyncState(this.userId);
    const resolved =
      mode === 'auto' ? (state.lastMessageEpoch ? 'incremental' : 'full') : mode;

    const log = logger.child({ userId: this.userId, mode: resolved });
    log.info('Sync starting');

    await markSyncStarted(this.userId);
    const settings = await getSettings(this.userId);
    const matcher = new TemplateMatcher(this.userId);

    try {
      const gmail = await GmailService.forUser(this.userId);
      const profile = await gmail.getProfile();

      // For incremental runs, only pull messages sent after the last one we saw.
      const extraQuery =
        resolved === 'incremental' && state.lastMessageEpoch
          ? `after:${Math.floor(Number(state.lastMessageEpoch) / 1000)}`
          : undefined;

      const maxEmails = settings.maxEmails > 0 ? settings.maxEmails : undefined;
      const batchSize = Math.max(10, settings.batchSize);

      let processed = 0;
      let maxEpoch = state.lastMessageEpoch ? Number(state.lastMessageEpoch) : 0;
      const pageBuffer: string[] = [];

      // Process exactly one batch of message ids: dedup → fetch → persist.
      const flushBatch = async (ids: string[]) => {
        // Skip messages already stored (incremental dedup at the source).
        const existing = await findExistingMessageIds(this.userId, ids);
        const freshIds = ids.filter((id) => !existing.has(id));
        await updateSyncProgress(this.userId, { totalScanned: ids.length });
        if (freshIds.length === 0) return;

        const parsed = await gmail.fetchMessages(freshIds);
        const written = await this.persistBatch(parsed, matcher);
        processed += written.count;
        maxEpoch = Math.max(maxEpoch, written.maxEpoch);
        await updateSyncProgress(this.userId, { processedInRun: written.count });
        log.debug({ processed }, 'Batch persisted');
      };

      await gmail.listSentMessageIds(
        async (ids) => {
          pageBuffer.push(...ids);
          // Drain in fixed-size batches to cap memory and DB transaction size.
          while (pageBuffer.length >= batchSize) {
            await flushBatch(pageBuffer.splice(0, batchSize));
          }
        },
        { extraQuery, maxResults: maxEmails },
      );
      // Drain any remaining ids below one full batch.
      if (pageBuffer.length > 0) await flushBatch(pageBuffer.splice(0));

      await markSyncFinished(this.userId, 'COMPLETED', {
        lastHistoryId: profile.historyId,
        lastMessageEpoch: maxEpoch > 0 ? BigInt(maxEpoch) : state.lastMessageEpoch,
      });
      log.info({ processed }, 'Sync completed');
      return { processed };
    } catch (error) {
      const message = toMessage(error);
      log.error({ err: error }, 'Sync failed');
      await markSyncFinished(this.userId, 'FAILED', { errorMessage: message });
      // Re-throw auth errors so the worker surfaces "reconnect" state.
      if (isAppError(error)) throw error;
      throw error;
    }
  }

  /**
   * Persist a batch of parsed emails. Groups by Gmail message so a template is
   * assigned once per message (multi-recipient messages share the template).
   * Returns the number of history rows written and the newest sentAt epoch.
   */
  private async persistBatch(
    parsed: ParsedSentEmail[],
    matcher: TemplateMatcher,
  ): Promise<{ count: number; maxEpoch: number }> {
    const byMessage = new Map<string, ParsedSentEmail[]>();
    for (const p of parsed) {
      const list = byMessage.get(p.gmailMessageId) ?? [];
      list.push(p);
      byMessage.set(p.gmailMessageId, list);
    }

    let count = 0;
    let maxEpoch = 0;

    for (const [, group] of byMessage) {
      const first = group[0]!;
      // One template decision per message body.
      const templateId = await matcher.assign(first.bodyText, first.subject);

      for (const email of group) {
        try {
          await this.persistOne(email, templateId);
          count += 1;
          maxEpoch = Math.max(maxEpoch, email.sentAt.getTime());
        } catch (error) {
          logger.warn({ err: error, messageId: email.gmailMessageId }, 'Failed to persist message');
        }
      }
    }

    return { count, maxEpoch };
  }

  /** Persist a single (message, recipient) pair inside a transaction. */
  private async persistOne(email: ParsedSentEmail, templateId: string): Promise<void> {
    const companyId = await upsertCompanyForEmail(this.userId, email.recipientEmail);

    await prisma.$transaction(async (tx) => {
      // Idempotency guard: skip if this exact (message, recipient) already exists.
      const existing = await tx.emailMessage.findUnique({
        where: {
          userId_gmailMessageId_recipientEmail: {
            userId: this.userId,
            gmailMessageId: email.gmailMessageId,
            recipientEmail: email.recipientEmail,
          },
        },
        select: { id: true },
      });
      if (existing) return;

      // Upsert the deduped recipient aggregate.
      const current = await tx.recipient.findUnique({
        where: { userId_email: { userId: this.userId, email: email.recipientEmail } },
      });

      let recipientId: string;
      if (!current) {
        const created = await tx.recipient.create({
          data: {
            userId: this.userId,
            email: email.recipientEmail,
            companyId,
            latestTemplateId: templateId,
            firstSentAt: email.sentAt,
            lastSentAt: email.sentAt,
            sentCount: 1,
            latestSubject: email.subject,
            latestBodyText: email.bodyText,
            latestBodyHtml: email.bodyHtml,
          },
          select: { id: true },
        });
        recipientId = created.id;
      } else {
        const isNewer = email.sentAt >= current.lastSentAt;
        const updated = await tx.recipient.update({
          where: { id: current.id },
          data: {
            sentCount: { increment: 1 },
            firstSentAt: email.sentAt < current.firstSentAt ? email.sentAt : current.firstSentAt,
            lastSentAt: email.sentAt > current.lastSentAt ? email.sentAt : current.lastSentAt,
            companyId: companyId ?? current.companyId,
            // Only overwrite "latest" fields when this message is the newest one.
            ...(isNewer
              ? {
                  latestTemplateId: templateId,
                  latestSubject: email.subject,
                  latestBodyText: email.bodyText,
                  latestBodyHtml: email.bodyHtml,
                }
              : {}),
          },
          select: { id: true },
        });
        recipientId = updated.id;
      }

      await tx.emailMessage.create({
        data: {
          userId: this.userId,
          gmailMessageId: email.gmailMessageId,
          threadId: email.threadId,
          historyId: email.historyId,
          recipientId,
          recipientEmail: email.recipientEmail,
          companyId,
          templateId,
          subject: email.subject,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          sentAt: email.sentAt,
        },
      });
    });
  }
}
