// Single source of truth for "which real email is allowed to hold an
// admin session" — checked by both app/auth/callback/route.ts (right
// after a Google sign-in) and middleware.ts (on every request, so a
// session created any other way — magic link, dashboard-created user,
// whatever — can't slip past just because it exists). One founder,
// hardcoded rather than an env var: this isn't a secret, and there's
// nothing to configure per-environment about who the one person allowed
// in is.
const ADMIN_ALLOWED_EMAIL = 'nishalpoojary810@gmail.com';

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_ALLOWED_EMAIL;
}
