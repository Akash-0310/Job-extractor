import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

/**
 * Layout for all authenticated pages. Performs a server-side session check and
 * redirects unauthenticated users to the sign-in page.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
