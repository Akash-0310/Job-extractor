'use client';

import { useState } from 'react';
import { qs } from '@/lib/api-client';
import type { RecipientFilters } from '@/types';

/** Triggers a browser download by navigating to the export endpoint. */
export function ExportButton({ filters }: { filters: RecipientFilters }) {
  const [open, setOpen] = useState(false);

  const download = (format: 'csv' | 'xlsx' | 'json', view?: 'full' | 'hr') => {
    const params = qs({
      format,
      view,
      q: filters.q,
      companyId: filters.companyId,
      domain: filters.domain,
      templateId: filters.templateId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    window.location.href = `/api/export${params}`;
    setOpen(false);
  };

  return (
    <div className="relative">
      <button className="btn-secondary" onClick={() => setOpen((o) => !o)}>
        ⬇️ Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => download('xlsx', 'hr')}
            >
              📗 Excel — HR list (email, company, template)
            </button>
            <div className="border-t border-slate-200 dark:border-slate-700" />
            <div className="px-4 pt-2 text-xs uppercase tracking-wide text-slate-400">
              Full export
            </div>
            {(['xlsx', 'csv', 'json'] as const).map((f) => (
              <button
                key={f}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => download(f, 'full')}
              >
                {f === 'csv' ? 'CSV (.csv)' : f === 'xlsx' ? 'Excel (.xlsx)' : 'JSON (.json)'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
