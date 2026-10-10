// Page/layout counterpart of requireAdmin() (lib/auth/requireAdmin.ts) for
// Server Components. Redirects to /login (the OTP entry page) unless the
// request carries a valid signed admin-session cookie (lib/adminSession.ts).
//
// The (dashboard) layout calls it, but a layout does not re-render on
// client-side navigation (Next's partial rendering), so any Server Component
// page that reads with supabaseAdmin must call it itself as well.
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionCookie } from '@/lib/adminSession';
import { adminEmail, adminUserId } from '@/lib/adminIdentity';
import type { AdminActor } from '@/lib/auth/requireAdmin';

export async function requireAdminPage(): Promise<AdminActor> {
  const cookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidAdminSessionCookie(cookie))) redirect('/login');
  return { id: adminUserId(), email: adminEmail() };
}
