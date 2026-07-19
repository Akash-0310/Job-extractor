import { getServerSession } from 'next-auth';
import { authOptions } from './options';
import { UnauthorizedError } from '@/lib/errors';

/** Return the current session or null (never throws). */
export function getSession() {
  return getServerSession(authOptions);
}

/**
 * Resolve the authenticated user id or throw UnauthorizedError.
 * Every protected API route funnels through this.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}
