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
 *
 * BullMQ ignores `add()` when a job with the same jobId already exists in ANY
 * state — including a retained completed/failed job (see removeOnComplete/
 * removeOnFail above). Without clearing those first, a finished job would
 * silently block every future manual re-trigger. So: if a job with this id is
 * already active/waiting/delayed, dedupe to it; if it has finished (completed/
 * failed) or is in an unknown state, remove it and enqueue a fresh run.
 */
export async function enqueueSync(userId: string, mode: SyncJobData['mode'] = 'auto') {
  const name = mode === 'full' ? JOB_NAMES.fullSync : JOB_NAMES.incrementalSync;
  const jobId = `sync:${userId}:${mode}`;

  const existing = await syncQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed' || state === 'waiting-children') {
      // A sync is genuinely in flight — reuse it instead of piling up.
      return existing;
    }
    // completed / failed / unknown: clear the stale record so we can re-run.
    await existing.remove();
  }

  return syncQueue.add(name, { userId, mode }, { jobId });
}
