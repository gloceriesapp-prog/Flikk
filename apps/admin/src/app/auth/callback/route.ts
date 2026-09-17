// Google OAuth lands here after consent (LoginPage's own
// signInWithOAuth redirectTo) with a real `?code=`. Exchanges it for a
// session on the SSR server client (same cookie adapter middleware.ts
// reads, exactly like api/auth/login/route.ts's own signInWithPassword
// does for the username/password path) — then immediately checks the
// resulting user's email against isAllowedAdminEmail (lib/adminAccess.ts).
// A non-matching Google account gets signed out again right here, before
// ever reaching a page — middleware.ts also re-checks this on every
// request as defense in depth, but rejecting at the source means a
// mismatched account never even sees a flash of the dashboard shell.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/overview';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Google sign-in did not return a code.')}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not complete Google sign-in.')}`);
  }

  if (!isAllowedAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('This Google account is not authorized for admin access.')}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
