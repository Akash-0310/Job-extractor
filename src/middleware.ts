import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight edge guard. Full authorization happens in the (app) server layout
 * and every API route via `requireUserId()`. This middleware only redirects
 * obviously-unauthenticated page navigations early by checking for the presence
 * of a NextAuth session cookie (it does not validate it — that is done server
 * side). API routes are left untouched so they can return JSON 401s.
 */
const SESSION_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

const PUBLIC_PATHS = ['/signin'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
