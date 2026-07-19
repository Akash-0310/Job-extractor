'use client';

import { useRecipientDetail } from '@/hooks/useApi';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export function RecipientDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useRecipientDetail(id);
  if (!id) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recipient details</h2>
          <button className="btn-secondary px-3 py-1" onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {data.recipient.email}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {data.recipient.company && <Badge variant="info">{data.recipient.company.name}</Badge>}
                {data.recipient.latestTemplate && (
                  <Badge>{data.recipient.latestTemplate.name}</Badge>
                )}
                <Badge variant="success">{data.recipient.sentCount} sent</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card p-3">
                <div className="text-xs text-slate-400">First sent</div>
                <div>{new Date(data.recipient.firstSentAt).toLocaleString()}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-slate-400">Latest sent</div>
                <div>{new Date(data.recipient.lastSentAt).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">Latest subject</div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                {data.recipient.latestSubject ?? <span className="text-slate-400">(none)</span>}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">Latest body</div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                {data.recipient.latestBodyText ?? '(no plain-text body)'}
              </pre>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-slate-500">
                Send history ({data.history.length})
              </div>
              <ul className="space-y-2">
                {data.history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-800"
                  >
                    <span className="min-w-0 truncate">{h.subject ?? '(no subject)'}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {new Date(h.sentAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
