// Maps to GET /referrals/my-code, POST /referrals/redeem,
// GET /referrals/my-invites (backend/src/routes/referrals.ts) — invite
// tracking only, no credit/discount on either side (that route file's own
// note on why: it's a loyalty/rewards mechanic, explicitly out of scope
// until MVP validates).

import { apiRequest } from './client';

export function fetchMyReferralCode(): Promise<{ code: string }> {
  return apiRequest('/referrals/my-code');
}

export function redeemReferralCode(code: string): Promise<{ ok: true }> {
  return apiRequest('/referrals/redeem', { method: 'POST', body: { code } });
}

export interface ReferralSignup {
  created_at: string;
  users: { name: string | null } | null;
}

export function fetchMyInvites(): Promise<ReferralSignup[]> {
  return apiRequest('/referrals/my-invites');
}
