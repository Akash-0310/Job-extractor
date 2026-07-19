export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      {description && <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
