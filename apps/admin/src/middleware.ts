// Real login gate — this dashboard had ZERO auth before the OTP flow (anyone
// with the URL had full founder access, including every app/api/* route
// backed by the service-role client). Runs on every request and blocks
// anything without a valid signed admin-session cookie (lib/adminSession.ts),
// which is set only after the emailed OTP is verified:
//  - a page request redirects to /login (the OTP entry page), with ?next= so
//    sign-in returns you where you were headed;
//  - an /api/* request gets a plain 401 JSON instead of a redirect, since a
//    fetch() caller can't follow an HTML redirect usefully.
//
// The signature + expiry on the cookie ARE the session — there is no Supabase
// user session to validate anymore (single emailed-OTP factor, one founder).

import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionCookie } from '@/lib/adminSession';

// Open only to the routes that PERFORM sign-in/out, before any session can
// exist: the OTP entry page, the OTP send/verify API, and logout. Everything
// else — page or API — needs a valid admin-session cookie.
const PUBLIC_PATHS = ['/login', '/api/auth/otp', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidAdminSessionCookie(cookie))) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next({ request });

  // Never cache the DATA responses — every /api read must reflect the current
  // database, not a browser/proxy-cached copy. Scoped to /api only on purpose:
  // no-store on page/RSC navigations disables Next's router prefetch/cache and
  // the browser bfcache, making every sidebar click a full cold roundtrip.
  if (pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }

  return response;
}

export const config = {
  // Everything except Next's own static/image assets and favicon — every page
  // and every API route (including ones added later) is gated by default;
  // opt a path out via PUBLIC_PATHS above rather than opting each one in.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
