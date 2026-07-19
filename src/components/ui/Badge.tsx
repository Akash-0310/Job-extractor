import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const styles: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  info: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return <span className={cn('badge', styles[variant], className)}>{children}</span>;
}
