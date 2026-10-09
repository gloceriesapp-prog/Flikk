// Page/layout counterpart of requireAdmin() (lib/auth/requireAdmin.ts) for
// Server Components. Redirects to /login unless the caller is the signed-in
// admin (allowed email, lib/adminAccess.ts).
//
// The (dashboard) layout calls it, but a layout does not re-render on
// client-side navigation (Next's partial rendering), so any Server Component
// page that reads with supabaseAdmin must call it itself as well.
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';
import type { AdminActor } from '@/lib/auth/requireAdmin';

export async function requireAdminPage(): Promise<AdminActor> {
  const user = await requireAdminSession();
  if (!user?.email || !isAllowedAdminEmail(user.email)) redirect('/login');
  return { id: user.id, email: user.email };
}
