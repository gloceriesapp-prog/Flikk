// Username/password sign-in — replaces the old magic-link flow entirely
// (single founder, no inbox dependency to log in). ADMIN_USERNAME/
// ADMIN_LOGIN_EMAIL map the chosen username to the real Supabase Auth
// user's email, since GoTrue itself only knows email+password, not
// usernames — the actual credential Supabase checks is still email+
// password under the hood. Runs on the SSR server client (not a plain
// anon client) so signInWithPassword's session gets written to cookies
// via the same cookie adapter middleware.ts reads, exactly like the old
// callback route did for exchangeCodeForSession.
//
// isAllowedAdminEmail (lib/adminAccess.ts) is checked here too, right
// after a successful password check — not just left for middleware.ts to
// catch on the next request. Per an explicit ask ("stick to
// [nishalpoojary810@gmail.com] only, reject all other emails, make a
// strict rule for it"): a correct username+password for ANY OTHER
// Supabase Auth account must never even report success here, let alone
// leave a session sitting in cookies that middleware then has to reject
// one request later. Signs the session back out immediately on mismatch,
// same as app/auth/callback/route.ts's own Google-path rejection.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as { username?: string; password?: string };
    if (!username || !password) throw new Error('Username and password are required.');

    const expectedUsername = process.env.ADMIN_USERNAME;
    const loginEmail = process.env.ADMIN_LOGIN_EMAIL;
    if (!expectedUsername || !loginEmail) throw new Error('Admin login is not configured.');

    if (username.trim().toLowerCase() !== expectedUsername.toLowerCase()) {
      throw new Error('Invalid username or password.');
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) throw new Error('Invalid username or password.');

    if (!isAllowedAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      throw new Error('This account is not authorized for admin access.');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid username or password.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
