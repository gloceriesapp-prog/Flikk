// Checks the emailed code and, on success, sets the signed admin-session
// cookie that is the SOLE proof of login — middleware.ts requires it for
// everything else. No prior session is involved.

import { NextResponse } from 'next/server';
import { adminUserId } from '@/lib/adminIdentity';
import { checkOtp } from '@/lib/adminOtp';
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions, createAdminSessionCookie } from '@/lib/adminSession';

const MESSAGES = {
  invalid: 'That code is incorrect.',
  expired: 'That code has expired. Send a new one.',
  locked: 'Too many wrong attempts. Send a new code.',
  missing: 'No code is active. Send a new one.',
} as const;

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = adminUserId();
  } catch {
    return NextResponse.json({ error: 'Admin sign-in is not configured.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  let result;
  try {
    result = await checkOtp(userId, code);
  } catch {
    return NextResponse.json({ error: 'Could not check the code. Please try again.' }, { status: 503 });
  }
  if (result !== 'ok') return NextResponse.json({ error: MESSAGES[result] }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionCookie(), adminSessionCookieOptions);
  return response;
}
