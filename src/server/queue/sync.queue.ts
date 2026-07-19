import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { QUEUE_NAMES, JOB_NAMES } from '@/config/constants';

export interface SyncJobData {
  userId: string;
  mode: 'full' | 'incremental' | 'auto';
}

/** The single queue that carries Gmail sync jobs. */
export const syncQueue = new Queue<SyncJobData>(QUEUE_NAMES.sync, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Enqueue a sync for a user. Uses a stable jobId per (user, mode) so a second
 * request while one is queued/running is deduplicated instead of piling up.
 */
export async function enqueueSync(userId: string, mode: SyncJobData['mode'] = 'auto') {
  const name = mode === 'full' ? JOB_NAMES.fullSync : JOB_NAMES.incrementalSync;
  return syncQueue.add(
    name,
    { userId, mode },
    { jobId: `sync:${userId}:${mode}` },
  );
}
