'use client';

import Link from 'next/link';
import { useDashboard } from '@/hooks/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { VolumeChart } from '@/components/dashboard/VolumeChart';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Could not load dashboard" description="Please try refreshing the page." />;
  }

  const { stats, topCompanies, monthly } = data;
  const neverSynced = stats.totalEmailsScanned === 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of the HR/company addresses extracted from your sent job applications."
      />

      {neverSynced && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-200">
          No emails scanned yet. Click <strong>Sync Gmail</strong> in the top bar to run your first
          scan. The first sync reads every sent email; later syncs only fetch new ones.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Emails Scanned" value={stats.totalEmailsScanned} icon="✉️" />
        <StatCard label="Unique Recipients" value={stats.uniqueRecipients} icon="👤" />
        <StatCard label="Duplicates Removed" value={stats.duplicatesRemoved} icon="🧹" />
        <StatCard label="Companies Found" value={stats.companiesFound} icon="🏢" />
        <StatCard label="Templates Detected" value={stats.templatesDetected} icon="🧩" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Sent volume (last 12 months)
          </h2>
          <VolumeChart data={monthly} />
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top companies</h2>
            <Link href="/companies" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {topCompanies.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No companies yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {c.name}
                    </div>
                    <div className="truncate text-xs text-slate-400">{c.domain}</div>
                  </div>
                  <span className="ml-2 shrink-0 text-slate-500 dark:text-slate-400">
                    {formatNumber(c.recipients)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
