'use client';

import { formatNumber } from '@/lib/utils';

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">
        {formatNumber(total)} {total === 1 ? 'result' : 'results'} · page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary px-3 py-1"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary px-3 py-1"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
