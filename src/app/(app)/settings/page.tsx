'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSettings, useUpdateSettings, useStartSync, type Settings } from '@/hooks/useApi';
import { useTheme } from '@/components/theme/ThemeProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const startSync = useStartSync();
  const { setTheme } = useTheme();

  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const save = () => {
    update.mutate(form);
    setTheme(form.theme.toLowerCase() as 'light' | 'dark' | 'system');
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Configure your Google account, sync behavior, and preferences." />

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Google account</h2>
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="h-10 w-10 rounded-full" />
            )}
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{session?.user?.name}</div>
              <div className="text-sm text-slate-500">{session?.user?.email}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Connected via Gmail OAuth (read-only). To switch accounts, sign out and sign in with a
            different Google account.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Sync</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sync interval (minutes)" hint="How often auto-sync runs.">
              <input
                type="number"
                min={5}
                className="input"
                value={form.syncIntervalMinutes}
                onChange={(e) => setForm({ ...form, syncIntervalMinutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Batch size" hint="Messages fetched per batch (10–500).">
              <input
                type="number"
                min={10}
                max={500}
                className="input"
                value={form.batchSize}
                onChange={(e) => setForm({ ...form, batchSize: Number(e.target.value) })}
              />
            </Field>
            <Field label="Max emails processed" hint="0 = unlimited.">
              <input
                type="number"
                min={0}
                className="input"
                value={form.maxEmails}
                onChange={(e) => setForm({ ...form, maxEmails: Number(e.target.value) })}
              />
            </Field>
            <Field label="Export folder" hint="Used by scheduled worker exports.">
              <input
                className="input"
                value={form.exportDir}
                onChange={(e) => setForm({ ...form, exportDir: e.target.value })}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoSyncEnabled}
              onChange={(e) => setForm({ ...form, autoSyncEnabled: e.target.checked })}
            />
            Enable automatic background sync
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => startSync.mutate('full')}>
              Run full re-sync
            </button>
            <button className="btn-secondary" onClick={() => startSync.mutate('incremental')}>
              Run incremental sync
            </button>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
          <Field label="Theme">
            <select
              className="input"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value as Settings['theme'] })}
            >
              <option value="SYSTEM">System</option>
              <option value="LIGHT">Light</option>
              <option value="DARK">Dark</option>
            </select>
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={update.isPending}>
            {update.isPending ? <Spinner className="h-4 w-4 text-white" /> : null}
            Save settings
          </button>
          {update.isSuccess && <span className="text-sm text-emerald-600">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
