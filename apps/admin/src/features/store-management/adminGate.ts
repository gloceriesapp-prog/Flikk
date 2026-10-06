import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

// Repeat authorization at privileged routes, independently of middleware.
export async function requireStoreAdmin(): Promise<NextResponse | null> {
  const user = await requireAdminSession();
  return user && isAllowedAdminEmail(user.email)
    ? null
    : NextResponse.json({ error: 'Administrator access required.' }, { status: 401 });
}
