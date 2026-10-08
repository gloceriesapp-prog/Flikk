// The one admin guard for every Route Handler under app/api/*.
//
// middleware.ts already blocks non-admin requests, but every handler calls
// this itself as well, so a route never depends on the middleware matcher
// alone (a matcher/PUBLIC_PATHS change, a direct call, or a future refactor
// can't silently expose a service-role route). scripts/check-api-guards.mjs
// fails lint if an exported handler under app/api forgets to call it.
//
// Usage, first lines of every exported handler:
//   const { denied } = await requireAdmin();
//   if (denied) return denied;
// or, when the handler records who acted:
//   const { actor, denied } = await requireAdmin();
//
// 401 = no signed-in session; 403 = signed in, but not the allowed admin
// email (lib/adminAccess.ts).
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export interface AdminActor {
  id: string;
  email: string;
}

export type AdminGuardResult = { actor: AdminActor; denied: null } | { actor: null; denied: NextResponse };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await requireAdminSession();
  if (!user) {
    return { actor: null, denied: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  }
  if (!user.email || !isAllowedAdminEmail(user.email)) {
    return { actor: null, denied: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }
  return { actor: { id: user.id, email: user.email }, denied: null };
}
