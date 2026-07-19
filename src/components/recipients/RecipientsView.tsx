'use client';

import { useState } from 'react';
import { useRecipients, type RecipientRow } from '@/hooks/useApi';
import { Filters } from './Filters';
import { ExportButton } from './ExportButton';
import { RecipientDrawer } from './RecipientDrawer';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatNumber } from '@/lib/utils';
import type { RecipientFilters } from '@/types';

export function RecipientsView({
  title,
  subtitle,
  showSearch = true,
}: {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
}) {
  const [filters, setFilters] = useState<RecipientFilters>({
    page: 1,
    pageSize: 25,
    sortBy: 'lastSentAt',
    sortDir: 'desc',
  });
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useRecipients(filters);

  const toggleSort = (sortBy: NonNullable<RecipientFilters['sortBy']>) =>
    setFilters((f) => ({
      ...f,
      sortBy,
      sortDir: f.sortBy === sortBy && f.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<ExportButton filters={filters} />}
      />

      <Filters filters={filters} onChange={setFilters} showSearch={showSearch} />

      <div className="card overflow-hidden">
        <div className="scrollable overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <Th onClick={() => toggleSort('email')}>Recipient</Th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Template</th>
                <Th onClick={() => toggleSort('sentCount')} className="text-right">
                  Sent
                </Th>
                <Th onClick={() => toggleSort('lastSentAt')}>Latest sent</Th>
                <th className="px-4 py-3">Latest subject</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((r) => (
                <RowItem key={r.id} row={r} onOpen={() => setSelected(r.id)} />
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : data && data.data.length === 0 ? (
          <EmptyState
            title="No recipients found"
            description="Adjust your filters, or run a Gmail sync to extract addresses from your sent mail."
          />
        ) : null}

        {data && data.data.length > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        )}
      </div>

      {isFetching && !isLoading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-3 w-3" /> Updating…
        </div>
      )}

      <RecipientDrawer id={selected} onClose={() => setSelected(null)} />
    </div>
  );

  function RowItem({ row, onOpen }: { row: RecipientRow; onOpen: () => void }) {
    return (
      <tr
        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
        onClick={onOpen}
      >
        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.email}</td>
        <td className="px-4 py-3">
          {row.company ? (
            <div>
              <div className="text-slate-700 dark:text-slate-300">{row.company.name}</div>
              <div className="text-xs text-slate-400">{row.company.domain}</div>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {row.latestTemplate ? <Badge>{row.latestTemplate.name}</Badge> : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.sentCount)}</td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
          {new Date(row.lastSentAt).toLocaleDateString()}
        </td>
        <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">
          {row.latestSubject ?? '—'}
        </td>
      </tr>
    );
  }
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 hover:text-slate-700 dark:hover:text-slate-300 ${className ?? ''}`}
      onClick={onClick}
    >
      {children} ↕
    </th>
  );
}
