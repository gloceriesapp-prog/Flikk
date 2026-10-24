// What RootNavigator shows for a signed-in session before it knows the
// account's status (no React Native imports, so loginGate.selfcheck.ts runs
// under plain Node).
//   'route'    -> status known (restored from SecureStore or fetched for this
//                 session): pick the right screen (shell, payout step, wizard).
//   'checking' -> GET /auth/me in flight: spinner.
//   'retry'    -> /auth/me failed or is slow: Retry / Log out screen. Never
//                 fall through to the onboarding wizard on missing status, or
//                 an approved rider whose check failed sees "become a rider".
export type LoginGate = 'route' | 'checking' | 'retry';

export function loginGate(s: {
  hasKnownStatus: boolean;
  statusLoaded: boolean;
  statusFailed: boolean;
  statusSlow: boolean;
}): LoginGate {
  if (s.hasKnownStatus || s.statusLoaded) return 'route';
  if (s.statusFailed || s.statusSlow) return 'retry';
  return 'checking';
}
