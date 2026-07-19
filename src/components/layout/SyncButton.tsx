'use client';

import { useSyncStatus, useStartSync } from '@/hooks/useApi';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export function SyncButton() {
  const { data: status } = useSyncStatus();
  const startSync = useStartSync();
  const running = status?.status === 'RUNNING';

  return (
    <div className="flex items-center gap-3">
      {status && (
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex dark:text-slate-400">
          {running ? (
            <>
              <Spinner className="h-4 w-4" />
              <span>
                Syncing… {status.processedInRun} processed / {status.totalScanned} scanned
              </span>
            </>
          ) : status.status === 'FAILED' ? (
            <Badge variant="danger">Last sync failed</Badge>
          ) : status.lastSyncEndedAt ? (
            <span>Last sync {new Date(status.lastSyncEndedAt).toLocaleString()}</span>
          ) : (
            <Badge variant="warning">Never synced</Badge>
          )}
        </div>
      )}
      <button
        className="btn-primary"
        disabled={running || startSync.isPending}
        onClick={() => startSync.mutate('auto')}
      >
        {running || startSync.isPending ? <Spinner className="h-4 w-4 text-white" /> : '🔄'}
        {running ? 'Syncing' : 'Sync Gmail'}
      </button>
    </div>
  );
}
