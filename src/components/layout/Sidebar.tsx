'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/emails', label: 'Email List', icon: '✉️' },
  { href: '/companies', label: 'Companies', icon: '🏢' },
  { href: '/templates', label: 'Templates', icon: '🧩' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-800">
        <span className="text-xl">📮</span>
        <span className="font-semibold text-slate-900 dark:text-white">Job Email Extractor</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-slate-800">
        Read-only · never sends email
      </div>
    </aside>
  );
}
