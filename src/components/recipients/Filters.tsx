'use client';

import { useCompanies, useTemplates } from '@/hooks/useApi';
import type { RecipientFilters } from '@/types';

export function Filters({
  filters,
  onChange,
  showSearch = true,
}: {
  filters: RecipientFilters;
  onChange: (next: RecipientFilters) => void;
  showSearch?: boolean;
}) {
  const { data: companies } = useCompanies({ pageSize: 200 });
  const { data: templates } = useTemplates({ pageSize: 200 });

  const set = (patch: Partial<RecipientFilters>) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {showSearch && (
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <input
            className="input"
            placeholder="Email, subject, company, domain…"
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Company</label>
        <select
          className="input"
          value={filters.companyId ?? ''}
          onChange={(e) => set({ companyId: e.target.value || undefined })}
        >
          <option value="">All companies</option>
          {companies?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Domain</label>
        <input
          className="input"
          placeholder="e.g. razorpay.com"
          value={filters.domain ?? ''}
          onChange={(e) => set({ domain: e.target.value || undefined })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Template</label>
        <select
          className="input"
          value={filters.templateId ?? ''}
          onChange={(e) => set({ templateId: e.target.value || undefined })}
        >
          <option value="">All templates</option>
          {templates?.data.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.emailCount})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            className="input"
            value={filters.dateFrom ?? ''}
            onChange={(e) => set({ dateFrom: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            className="input"
            value={filters.dateTo ?? ''}
            onChange={(e) => set({ dateTo: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <button
          className="btn-secondary"
          onClick={() =>
            onChange({ sortBy: filters.sortBy, sortDir: filters.sortDir, page: 1, pageSize: filters.pageSize })
          }
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
