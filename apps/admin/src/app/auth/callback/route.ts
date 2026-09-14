// Magic-link landing route — Supabase redirects here with a `code` query
// param after the founder clicks the emailed link. Exchanging it for a
// real session (and setting the cookies via the server client) is what
// actually signs them in; middleware.ts then lets every other route
// through once this cookie exists.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/overview';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
