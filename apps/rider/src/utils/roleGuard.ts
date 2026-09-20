// One phone number, one role — real across all 4 apps (they share one
// Supabase Auth + `users` table, one `role` column, backend/src/routes/
// auth.ts). A number that's already committed to a different role (an
// approved store owner trying to log into this app) gets a clear, honest
// error here — checked right after OTP verify, BEFORE the session is ever
// persisted (this app's own OtpVerificationScreen.tsx), so a mismatched
// account never gets into a half-working logged-in state. AccountStatus
// Screen.tsx still exists for the OTHER real gap this doesn't cover —
// role='rider' but not yet admin-approved.

import type { AccountRole } from '../store/useAuthStore';

const ROLE_APP_LABEL: Record<AccountRole, string> = {
  customer: 'Customer',
  store_owner: 'Partner',
  rider: 'Rider',
  admin: 'Admin',
};

// 'customer' is allowed too — the real, default state every brand new
// applicant's number is in before they've ever applied to become a rider.
export const ALLOWED_ROLES: AccountRole[] = ['customer', 'rider'];

// Returns a real, professional error message if `role` isn't allowed on
// this app, or null if it's fine to continue.
export function roleMismatchMessage(role: AccountRole, allowedRoles: AccountRole[] = ALLOWED_ROLES): string | null {
  if (allowedRoles.includes(role)) return null;
  if (role === 'admin') {
    return 'This number is registered as a Gloceries Admin account. Please use the admin dashboard instead.';
  }
  const appLabel = ROLE_APP_LABEL[role];
  return `This number is already registered as a Gloceries ${appLabel} account. Please open the ${appLabel} app to continue, or sign in here with a different number.`;
}
