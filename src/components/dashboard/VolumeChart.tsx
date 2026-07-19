'use client';

import { formatNumber } from '@/lib/utils';

/** Lightweight dependency-free monthly bar chart. */
export function VolumeChart({ data }: { data: { month: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand-500 transition-all hover:bg-brand-600"
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              title={`${d.month}: ${formatNumber(d.count)}`}
            />
          </div>
          <span className="text-[10px] text-slate-400">{d.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}
