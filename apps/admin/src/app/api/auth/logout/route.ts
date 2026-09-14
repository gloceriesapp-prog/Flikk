// Signs out the current session (clears the auth cookies) and sends the
// browser back to /login. POST, not GET — a logout that fires on a plain
// link/prefetch would be a real footgun (any request to it ends the
// session).

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}
