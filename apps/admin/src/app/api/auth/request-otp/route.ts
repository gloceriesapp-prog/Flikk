// Sends a Supabase magic-link email — the entire sign-in flow for this
// solo-founder tool. No password to invent/store/rotate; Supabase's own
// GoTrue handles the link's expiry/one-time-use. ADMIN_ALLOWED_EMAILS
// (server-only env, comma-separated) is the actual access control: even
// though Supabase's signInWithOtp would happily email a link to (and
// silently create an Auth user for) ANY address, only an allowlisted
// email here ever gets one sent, so someone finding this dashboard's URL
// can't just request their own way in with their own inbox.
//
// Always returns the same generic response regardless of whether the
// email was allowlisted — same "don't leak which emails are valid"
// reasoning as backend/src/routes/auth.ts's own OTP endpoint.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isAllowedEmail(email: string): boolean {
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function POST(request: Request) {
  try {
    const { email, redirectOrigin } = (await request.json()) as { email?: string; redirectOrigin?: string };
    if (!email) throw new Error('Email is required.');

    if (isAllowedEmail(email)) {
      // A fresh client per request, anon key — signInWithOtp is a public
      // GoTrue endpoint, no session needed to call it.
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${redirectOrigin}/auth/callback` },
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send the sign-in link.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
