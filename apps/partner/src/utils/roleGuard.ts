// One phone number, one role — real across all 4 apps (they share one
// Supabase Auth + `users` table, one `role` column, backend/src/routes/
// auth.ts). A number that's already committed to a different role (an
// approved rider trying to log into this app) gets a clear, honest error
// here — checked right after OTP verify, BEFORE the session is ever
// persisted (this app's own OtpVerificationScreen.tsx), so a mismatched
// account never gets into a half-working logged-in state.

export type AccountRole = 'customer' | 'store_owner' | 'rider' | 'admin';

const ROLE_APP_LABEL: Record<AccountRole, string> = {
  customer: 'Customer',
  store_owner: 'Partner',
  rider: 'Rider',
  admin: 'Admin',
};

// 'customer' is allowed too — that's the real, default state every brand
// new applicant's number is in before they've ever applied to become a
// store owner (RootNavigator's own StoreSetup flow handles that case).
// 'store_owner' is a returning, already-approved partner logging back in.
export const ALLOWED_ROLES: AccountRole[] = ['customer', 'store_owner'];

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
