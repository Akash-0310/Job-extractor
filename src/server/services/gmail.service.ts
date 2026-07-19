import type { gmail_v1 } from 'googleapis';
import { getGmailClient } from '@/server/auth/gmail-client';
import { GMAIL_LIST_PAGE_SIZE, GMAIL_SENT_QUERY, GMAIL_GET_CONCURRENCY } from '@/config/constants';
import { htmlToPlainText } from './text.util';
import { isCompanyContactEmail } from './company.service';
import { withRetry, chunk } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { GmailAuthError, RateLimitError } from '@/lib/errors';
import type { ParsedSentEmail } from '@/types';

/** Extract every `addr@host` from a header value that may contain display names. */
function extractEmails(headerValue: string | undefined): string[] {
  if (!headerValue) return [];
  const matches = headerValue.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/**
 * Recursively walk MIME parts collecting text/plain and text/html bodies.
 * Attachments (parts with a filename or an attachmentId) are IGNORED entirely —
 * we never download or process PDFs, images, docs, or archives.
 */
function collectBodies(
  part: gmail_v1.Schema$MessagePart | undefined,
  acc: { text: string[]; html: string[] },
): void {
  if (!part) return;

  const isAttachment = Boolean(part.filename && part.filename.length > 0) || Boolean(part.body?.attachmentId);
  const mimeType = part.mimeType ?? '';

  if (!isAttachment && part.body?.data) {
    if (mimeType === 'text/plain') acc.text.push(decodeBase64Url(part.body.data));
    else if (mimeType === 'text/html') acc.html.push(decodeBase64Url(part.body.data));
  }

  if (part.parts) {
    for (const child of part.parts) collectBodies(child, acc);
  }
}

/** Determine if a Gmail/Googleapis error is a transient rate-limit / server error. */
function isTransientGmailError(error: unknown): boolean {
  const status = (error as { code?: number; status?: number })?.code ?? (error as { status?: number })?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isAuthError(error: unknown): boolean {
  const status = (error as { code?: number })?.code;
  return status === 401 || status === 403;
}

export class GmailService {
  constructor(private readonly gmail: gmail_v1.Gmail) {}

  static async forUser(userId: string): Promise<GmailService> {
    const gmail = await getGmailClient(userId);
    return new GmailService(gmail);
  }

  /** Current mailbox profile — used to snapshot the historyId for incremental sync. */
  async getProfile(): Promise<{ historyId: string | null; emailAddress: string | null }> {
    const res = await withRetry(() => this.gmail.users.getProfile({ userId: 'me' }), {
      shouldRetry: isTransientGmailError,
    });
    return {
      historyId: res.data.historyId ?? null,
      emailAddress: res.data.emailAddress ?? null,
    };
  }

  /**
   * List sent message ids matching an optional extra query, page by page.
   * `onPage` is invoked with each page of ids so the caller can process
   * incrementally without holding every id in memory (scales to 50k+).
   */
  async listSentMessageIds(
    onPage: (ids: string[]) => Promise<void>,
    opts: { extraQuery?: string; maxResults?: number } = {},
  ): Promise<number> {
    let pageToken: string | undefined;
    let seen = 0;
    const query = opts.extraQuery ? `${GMAIL_SENT_QUERY} ${opts.extraQuery}` : GMAIL_SENT_QUERY;

    do {
      const res = await withRetry(
        () =>
          this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: GMAIL_LIST_PAGE_SIZE,
            pageToken,
          }),
        { shouldRetry: isTransientGmailError, onRetry: (e, a) => logger.warn({ attempt: a, err: e }, 'Retry messages.list') },
      ).catch((e) => {
        if (isAuthError(e)) throw new GmailAuthError();
        if (isTransientGmailError(e)) throw new RateLimitError();
        throw e;
      });

      const ids = (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
      if (ids.length > 0) {
        seen += ids.length;
        await onPage(ids);
      }
      pageToken = res.data.nextPageToken ?? undefined;

      if (opts.maxResults && seen >= opts.maxResults) break;
    } while (pageToken);

    return seen;
  }

  /** Fetch and parse a single message. Returns one ParsedSentEmail per recipient. */
  async fetchMessage(messageId: string): Promise<ParsedSentEmail[]> {
    const res = await withRetry(
      () =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        }),
      { shouldRetry: isTransientGmailError },
    ).catch((e) => {
      if (isAuthError(e)) throw new GmailAuthError();
      if (isTransientGmailError(e)) throw new RateLimitError();
      throw e;
    });

    const msg = res.data;
    const headers = msg.payload?.headers;

    const toRecipients = [
      ...extractEmails(getHeader(headers, 'To')),
      ...extractEmails(getHeader(headers, 'Cc')),
    ];
    // Keep only genuine company/HR addresses — drop personal (gmail.com, …) and
    // automated/support (no-reply@, support@, …) recipients at the source so
    // they are never stored. See isCompanyContactEmail.
    const uniqueRecipients = Array.from(new Set(toRecipients)).filter(isCompanyContactEmail);
    if (uniqueRecipients.length === 0) return [];

    const subject = getHeader(headers, 'Subject') ?? null;

    // Robust sent timestamp: prefer Gmail internalDate (epoch ms), fall back to Date header.
    let sentAt = new Date();
    if (msg.internalDate) {
      sentAt = new Date(Number(msg.internalDate));
    } else {
      const dateHeader = getHeader(headers, 'Date');
      if (dateHeader) {
        const parsed = new Date(dateHeader);
        if (!Number.isNaN(parsed.getTime())) sentAt = parsed;
      }
    }

    // Collect bodies (attachments ignored inside collectBodies).
    const acc = { text: [] as string[], html: [] as string[] };
    collectBodies(msg.payload, acc);

    let bodyHtml = acc.html.length > 0 ? acc.html.join('\n') : null;
    let bodyText = acc.text.length > 0 ? acc.text.join('\n') : null;

    // If only HTML exists, derive plain text. If neither, fall back to snippet.
    if (!bodyText && bodyHtml) {
      try {
        bodyText = htmlToPlainText(bodyHtml);
      } catch (e) {
        logger.warn({ messageId, err: e }, 'Failed to convert HTML body; using snippet');
        bodyText = msg.snippet ?? null;
      }
    }
    if (!bodyText && !bodyHtml) {
      bodyText = msg.snippet ?? null;
    }
    // Guard against corrupted/oversized HTML blowing up the DB row.
    if (bodyHtml && bodyHtml.length > 1_000_000) bodyHtml = bodyHtml.slice(0, 1_000_000);
    if (bodyText && bodyText.length > 500_000) bodyText = bodyText.slice(0, 500_000);

    return uniqueRecipients.map((recipientEmail) => ({
      gmailMessageId: msg.id!,
      threadId: msg.threadId ?? null,
      historyId: msg.historyId ?? null,
      recipientEmail,
      subject,
      bodyText,
      bodyHtml,
      sentAt,
    }));
  }

  /** Fetch a batch of message ids with bounded concurrency. */
  async fetchMessages(messageIds: string[]): Promise<ParsedSentEmail[]> {
    const out: ParsedSentEmail[] = [];
    for (const group of chunk(messageIds, GMAIL_GET_CONCURRENCY)) {
      const results = await Promise.allSettled(group.map((id) => this.fetchMessage(id)));
      for (const r of results) {
        if (r.status === 'fulfilled') {
          out.push(...r.value);
        } else {
          // A single deleted/corrupt message must not fail the whole batch.
          logger.warn({ err: r.reason }, 'Skipping message that failed to fetch');
        }
      }
    }
    return out;
  }
}
