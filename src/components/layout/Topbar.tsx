'use client';

import { signOut, useSession } from 'next-auth/react';
import { ThemeToggle } from './ThemeToggle';
import { SyncButton } from './SyncButton';

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="lg:hidden font-semibold text-slate-900 dark:text-white">📮 Extractor</div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <SyncButton />
        <ThemeToggle />
        <div className="flex items-center gap-2">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700"
            />
          )}
          <button
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => signOut({ callbackUrl: '/signin' })}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
