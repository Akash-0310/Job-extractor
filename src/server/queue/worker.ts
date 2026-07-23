/**
 * Background worker entrypoint. Run with `npm run worker` (or the worker Docker
 * service). Processes Gmail sync jobs out of the request path so the web app
 * stays responsive and long 50k-message syncs survive restarts/retries.
 */
import 'dotenv/config';
import dns from 'node:dns';
// Prefer IPv4 when resolving hostnames. Google APIs publish both A and AAAA
// records; on networks with a broken/unroutable IPv6 path, Node's Happy Eyeballs
// can pick the IPv6 address and the connection stalls or is reset mid-response
// (ETIMEDOUT / ERR_STREAM_PREMATURE_CLOSE against gmail.googleapis.com).
dns.setDefaultResultOrder('ipv4first');

import { Worker, type Job } from 'bullmq';
import { redisConnection } from './connection';
import { syncQueue, enqueueSync, type SyncJobData } from './sync.queue';
import { QUEUE_NAMES } from '@/config/constants';
import { SyncService } from '@/server/services/sync.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { toMessage } from '@/lib/errors';

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);

const worker = new Worker<SyncJobData>(
  QUEUE_NAMES.sync,
  async (job: Job<SyncJobData>) => {
    const { userId, mode } = job.data;
    logger.info({ jobId: job.id, userId, mode }, 'Processing sync job');
    const service = new SyncService(userId);
    const result = await service.run(mode);
    return result;
  },
  { connection: redisConnection, concurrency: CONCURRENCY },
);

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Sync job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: toMessage(err) }, 'Sync job failed');
});

/**
 * Auto-sync scheduler: every 5 minutes, find users who enabled auto-sync and
 * whose interval has elapsed, and enqueue an incremental sync for each.
 */
async function scheduleAutoSyncs() {
  try {
    const users = await prisma.userSettings.findMany({
      where: { autoSyncEnabled: true },
      select: { userId: true, syncIntervalMinutes: true },
    });
    const now = Date.now();
    for (const u of users) {
      const state = await prisma.syncState.findUnique({ where: { userId: u.userId } });
      const last = state?.lastSyncEndedAt?.getTime() ?? 0;
      const dueAt = last + u.syncIntervalMinutes * 60_000;
      if (state?.status !== 'RUNNING' && now >= dueAt) {
        await enqueueSync(u.userId, 'incremental');
        logger.info({ userId: u.userId }, 'Auto-sync enqueued');
      }
    }
  } catch (error) {
    logger.error({ err: toMessage(error) }, 'Auto-sync scheduler tick failed');
  }
}

const schedulerInterval = setInterval(scheduleAutoSyncs, 5 * 60_000);
// Kick once shortly after boot.
setTimeout(scheduleAutoSyncs, 15_000);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Worker shutting down');
  clearInterval(schedulerInterval);
  await worker.close();
  await syncQueue.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info({ concurrency: CONCURRENCY }, 'Gmail sync worker started');
