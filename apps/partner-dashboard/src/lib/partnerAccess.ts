// Accept the role before storing credentials. A previous application flag
// never grants access to an account that is now a rider or administrator.
export function canStartPartnerSession(account: { role: string; application_submitted: boolean }): boolean {
  return account.role === 'store_owner' || (account.role === 'customer' && account.application_submitted);
}
