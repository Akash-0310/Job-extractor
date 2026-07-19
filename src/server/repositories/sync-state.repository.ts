import { prisma } from '@/lib/prisma';
import { Prisma, type SyncStatus } from '@prisma/client';

export async function getSyncState(userId: string) {
  try {
    return await prisma.syncState.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  } catch (error) {
    // Concurrent first-load requests (e.g. /api/stats and /api/sync firing
    // together) can both find no row and race to create it. The loser hits the
    // unique constraint on `userId` (P2002); by then the row exists, so read it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.syncState.findUniqueOrThrow({ where: { userId } });
    }
    throw error;
  }
}

export async function markSyncStarted(userId: string) {
  await getSyncState(userId);
  return prisma.syncState.update({
    where: { userId },
    data: {
      status: 'RUNNING',
      lastSyncStartedAt: new Date(),
      lastSyncEndedAt: null,
      processedInRun: 0,
      errorMessage: null,
    },
  });
}

export async function updateSyncProgress(
  userId: string,
  data: { processedInRun?: number; totalScanned?: number },
) {
  return prisma.syncState.update({
    where: { userId },
    data: {
      ...(data.processedInRun != null ? { processedInRun: { increment: data.processedInRun } } : {}),
      ...(data.totalScanned != null ? { totalScanned: { increment: data.totalScanned } } : {}),
    },
  });
}

export async function markSyncFinished(
  userId: string,
  status: Extract<SyncStatus, 'COMPLETED' | 'FAILED'>,
  extra: { lastHistoryId?: string | null; lastMessageEpoch?: bigint | null; errorMessage?: string | null } = {},
) {
  return prisma.syncState.update({
    where: { userId },
    data: {
      status,
      lastSyncEndedAt: new Date(),
      ...(extra.lastHistoryId !== undefined ? { lastHistoryId: extra.lastHistoryId } : {}),
      ...(extra.lastMessageEpoch !== undefined ? { lastMessageEpoch: extra.lastMessageEpoch } : {}),
      ...(extra.errorMessage !== undefined ? { errorMessage: extra.errorMessage } : {}),
    },
  });
}
