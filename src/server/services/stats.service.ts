import { prisma } from '@/lib/prisma';
import { countMessages } from '@/server/repositories/message.repository';
import { countRecipients } from '@/server/repositories/recipient.repository';
import { countCompanies } from '@/server/repositories/company.repository';
import { countTemplates } from '@/server/repositories/template.repository';
import { getSyncState } from '@/server/repositories/sync-state.repository';
import type { DashboardStats } from '@/types';

/**
 * Compute dashboard aggregates. "Duplicates removed" is the number of extra
 * sent messages beyond the first per recipient (total messages - unique
 * recipients), i.e. how much the dedup collapsed the raw history.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [totalMessages, uniqueRecipients, companies, templates, syncState] = await Promise.all([
    countMessages(userId),
    countRecipients(userId),
    countCompanies(userId),
    countTemplates(userId),
    getSyncState(userId),
  ]);

  return {
    totalEmailsScanned: totalMessages,
    uniqueRecipients,
    duplicatesRemoved: Math.max(0, totalMessages - uniqueRecipients),
    companiesFound: companies,
    templatesDetected: templates,
    lastSyncEndedAt: syncState.lastSyncEndedAt ? syncState.lastSyncEndedAt.toISOString() : null,
    syncStatus: syncState.status,
  };
}

/** Top companies by recipient count for the dashboard. */
export async function getTopCompanies(userId: string, limit = 8) {
  return prisma.company.findMany({
    where: { userId },
    orderBy: { recipients: { _count: 'desc' } },
    take: limit,
    include: { _count: { select: { recipients: true } } },
  });
}

/** Sent-volume grouped by month (last 12 months) for a simple chart. */
export async function getMonthlyVolume(userId: string): Promise<{ month: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ month: Date; count: bigint }[]>`
    SELECT date_trunc('month', "sentAt") AS month, COUNT(*)::bigint AS count
    FROM "EmailMessage"
    WHERE "userId" = ${userId}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  `;
  return rows
    .map((r) => ({ month: r.month.toISOString().slice(0, 7), count: Number(r.count) }))
    .reverse();
}
