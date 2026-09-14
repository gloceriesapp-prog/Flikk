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
// /login and /auth/callback (the magic-link landing route) are the only
// two paths left open — everything else, page or API, requires a real
// signed-in session. See app/login/page.tsx and app/api/auth/* for the
// actual sign-in flow (email allowlist + Supabase magic link, not a
// password this solo-founder tool would have to store/rotate).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// /api/auth/* has to stay open too — that's the route that REQUESTS the
// magic link in the first place, before any session can exist yet.
const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/auth'];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
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
