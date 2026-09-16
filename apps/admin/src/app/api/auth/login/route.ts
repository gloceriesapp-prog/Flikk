// Username/password sign-in — replaces the old magic-link flow entirely
// (single founder, no inbox dependency to log in). ADMIN_USERNAME/
// ADMIN_LOGIN_EMAIL map the chosen username to the real Supabase Auth
// user's email, since GoTrue itself only knows email+password, not
// usernames — the actual credential Supabase checks is still email+
// password under the hood. Runs on the SSR server client (not a plain
// anon client) so signInWithPassword's session gets written to cookies
// via the same cookie adapter middleware.ts reads, exactly like the old
// callback route did for exchangeCodeForSession.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) throw new Error('Invalid username or password.');

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid username or password.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
