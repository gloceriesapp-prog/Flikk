// Ends the admin session by clearing the signed session cookie
// (lib/adminSession.ts) and sending the browser back to /login (the OTP
// entry page). POST, not GET — a logout that fired on a plain link/prefetch
// would be a footgun (any request to it would end the session).

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions } from '@/lib/adminSession';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookieOptions, maxAge: 0 });
  return response;
}
