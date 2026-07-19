import { prisma } from '@/lib/prisma';

/**
 * Return the subset of the given Gmail message ids that already exist for this
 * user, so the sync can skip already-processed messages (incremental behavior).
 */
export async function findExistingMessageIds(
  userId: string,
  gmailMessageIds: string[],
): Promise<Set<string>> {
  if (gmailMessageIds.length === 0) return new Set();
  const rows = await prisma.emailMessage.findMany({
    where: { userId, gmailMessageId: { in: gmailMessageIds } },
    select: { gmailMessageId: true },
    distinct: ['gmailMessageId'],
  });
  return new Set(rows.map((r) => r.gmailMessageId));
}

export function countMessages(userId: string) {
  return prisma.emailMessage.count({ where: { userId } });
}

export async function listMessagesForRecipient(userId: string, recipientId: string) {
  return prisma.emailMessage.findMany({
    where: { userId, recipientId },
    orderBy: { sentAt: 'desc' },
    take: 200,
    include: { template: { select: { id: true, name: true } } },
  });
}
