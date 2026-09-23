// Real login gate — this dashboard had ZERO auth before this (anyone with
// the URL had full founder access, including every app/api/* route
// backed by the service-role client). Runs on every request; refreshes
// the Supabase session cookie (required so a session doesn't silently
// expire mid-visit — see the Supabase SSR docs' own note on why this
// exact refresh dance lives in middleware, not just the server client),
// then blocks anything unauthenticated:
//  - a page request redirects to /login (with ?next= so login returns you
//    where you were headed)
//  - an /api/* request gets a plain 401 JSON instead of a redirect, since
//    a fetch() caller can't follow an HTML redirect usefully
//
// /login is the only page left open — everything else, page or API,
// requires a real signed-in session. See app/login/page.tsx and
// app/api/auth/login/route.ts for the username/password sign-in flow, and
// app/auth/callback/route.ts for the Google one.
//
// A valid session alone isn't enough, though — isAllowedAdminEmail
// (lib/adminAccess.ts) is re-checked here on EVERY request, not just at
// sign-in time, so a session created any other way (a user added directly
// in the Supabase dashboard, a stale session from before this check
// existed) can't reach anything either. This is the one real enforcement
// point for "only this one email is admin" — app/auth/callback/route.ts's
// own check is a courtesy that rejects a mismatched Google account before
// it ever sees the dashboard shell, not a second place this same rule has
// to stay in sync.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

// /api/auth/* and /auth/callback have to stay open too — those are the
// routes that PERFORM the sign-in in the first place, before any session
// can exist yet.
const PUBLIC_PATHS = ['/login', '/api/auth', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the session against Supabase on every request and
  // triggers the cookie refresh above — the proven, secure gate. (An
  // earlier getClaims() swap for speed broke auth in this project's JWT
  // setup — claims/email didn't populate, so every page redirected to
  // /login and every /api returned 401, which read as "no content / backend
  // not syncing". Reverted: correctness over the micro-optimization.)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdminEmail(user.email)) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Never cache the DATA responses — every /api read must reflect the
  // current database, not a browser/proxy-cached copy. Scoped to /api only
  // on purpose: putting no-store on page/RSC navigation responses too
  // disables Next's own router prefetch/cache and the browser bfcache,
  // which makes every sidebar click do a full cold roundtrip and feel
  // "stuck" instead of the smooth client-side transition Next gives for
  // free. Pages stay fast; their data (fetched from these /api routes) is
  // still always fresh.
  if (pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }

  return response;
}

export const config = {
  // Everything except Next's own static/image assets and favicon — every
  // page and every API route (including ones added later) is gated by
  // default, opting a path out (PUBLIC_PATHS above) rather than opting
  // each one in one at a time.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
