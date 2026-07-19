import { formatNumber } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`text-xl ${accent ?? ''}`} aria-hidden>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        {formatNumber(value)}
      </div>
    </div>
  );
}
