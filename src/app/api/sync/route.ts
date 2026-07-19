import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { syncSchema } from '@/server/api/validation';
import { enqueueSync } from '@/server/queue/sync.queue';
import { getSyncState } from '@/server/repositories/sync-state.repository';
import type { SyncProgress } from '@/types';

export const dynamic = 'force-dynamic';

/** POST /api/sync — enqueue a Gmail sync job. */
export const POST = apiHandler(async (req) => {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const { mode } = syncSchema.parse(body);

  const job = await enqueueSync(userId, mode);
  return json({ enqueued: true, jobId: job.id, mode }, { status: 202 });
});

/** GET /api/sync — current sync progress for the user. */
export const GET = apiHandler(async () => {
  const userId = await requireUserId();
  const state = await getSyncState(userId);
  const progress: SyncProgress = {
    status: state.status,
    totalScanned: state.totalScanned,
    processedInRun: state.processedInRun,
    lastSyncStartedAt: state.lastSyncStartedAt?.toISOString() ?? null,
    lastSyncEndedAt: state.lastSyncEndedAt?.toISOString() ?? null,
    errorMessage: state.errorMessage,
  };
  return json(progress);
});
