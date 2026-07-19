'use client';

import { useState } from 'react';
import { useCompanies } from '@/hooks/useApi';
import { CompanyExportButton } from '@/components/companies/CompanyExportButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/utils';

export default function CompaniesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCompanies({ q: q || undefined, page, pageSize: 25 });

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Companies inferred from recipient email domains."
        actions={<CompanyExportButton q={q || undefined} />}
      />

      <div className="card mb-4 p-4">
        <input
          className="input"
          placeholder="Search companies or domains…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="scrollable overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3 text-right">Recipients</th>
                <th className="px-4 py-3 text-right">Total emails</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.domain}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.recipients)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.messages)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : data && data.data.length === 0 ? (
          <EmptyState title="No companies found" description="Run a Gmail sync to populate companies." />
        ) : null}

        {data && data.data.length > 0 && (
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        )}
      </div>
    </div>
  );
}
