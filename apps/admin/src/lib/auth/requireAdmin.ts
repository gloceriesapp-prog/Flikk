// The one admin guard for every Route Handler under app/api/*.
//
// middleware.ts already blocks requests without a valid admin-session cookie,
// but every handler calls this itself as well, so a route never depends on
// the middleware matcher alone (a matcher/PUBLIC_PATHS change, a direct call,
// or a future refactor can't silently expose a service-role route).
// eslint-rules/require-admin-guard.mjs fails lint if an exported handler under
// app/api forgets to call it.
//
// Usage, first lines of every exported handler:
//   const { denied } = await requireAdmin();
//   if (denied) return denied;
// or, when the handler records who acted:
//   const { actor, denied } = await requireAdmin();
//
// 401 = no valid admin session (the signed OTP cookie, lib/adminSession.ts).
// The actor is the single configured admin identity (lib/adminIdentity.ts).
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionCookie } from '@/lib/adminSession';
import { adminEmail, adminUserId } from '@/lib/adminIdentity';

export interface AdminActor {
  id: string;
  email: string;
}

export type AdminGuardResult = { actor: AdminActor; denied: null } | { actor: null; denied: NextResponse };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const cookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidAdminSessionCookie(cookie))) {
    return { actor: null, denied: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  }
  return { actor: { id: adminUserId(), email: adminEmail() }, denied: null };
}
