'use client';

import { useState } from 'react';
import { qs } from '@/lib/api-client';

/** Downloads the company list (Company, Domain, Email) from the export endpoint. */
export function CompanyExportButton({ q }: { q?: string }) {
  const [open, setOpen] = useState(false);

  const download = (format: 'xlsx' | 'csv' | 'json') => {
    window.location.href = `/api/companies/export${qs({ format, q })}`;
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
              onClick={() => download('xlsx')}
            >
              📗 Excel — company list (company, email)
            </button>
            {(['csv', 'json'] as const).map((f) => (
              <button
                key={f}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => download(f)}
              >
                {f === 'csv' ? 'CSV (.csv)' : 'JSON (.json)'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
