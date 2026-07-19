'use client';

import { useState } from 'react';
import { useTemplates, useRenameTemplate, type TemplateRow } from '@/hooks/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';

export default function TemplatesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTemplates({ page, pageSize: 12 });

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Email bodies grouped by similarity. Variations in company, role, or date collapse into one template."
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : data && data.data.length === 0 ? (
        <EmptyState
          title="No templates detected"
          description="Run a Gmail sync — templates are detected automatically from your sent emails."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.data.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
          {data && (
            <div className="card mt-4">
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const rename = useRenameTemplate();

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        {editing ? (
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        ) : (
          <h3 className="font-semibold text-slate-900 dark:text-white">{template.name}</h3>
        )}
        {editing ? (
          <button
            className="btn-primary px-3 py-1 text-xs"
            onClick={() =>
              rename.mutate({ id: template.id, name }, { onSuccess: () => setEditing(false) })
            }
          >
            Save
          </button>
        ) : (
          <button className="btn-secondary px-3 py-1 text-xs" onClick={() => setEditing(true)}>
            Rename
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="info">{formatNumber(template.emailCount)} emails</Badge>
        <Badge>{formatNumber(template.recipients)} recipients</Badge>
      </div>

      {template.sampleSubject && (
        <div className="mb-2 text-xs">
          <span className="font-medium text-slate-500">Sample subject: </span>
          <span className="text-slate-700 dark:text-slate-300">{template.sampleSubject}</span>
        </div>
      )}

      <pre className="max-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {template.sampleBodyText ?? '(no sample body)'}
      </pre>
    </div>
  );
}
