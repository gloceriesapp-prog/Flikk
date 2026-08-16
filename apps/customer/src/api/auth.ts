// Maps to POST /auth/otp/request and POST /auth/otp/verify — shared across all
// 4 apps per specs/00-foundation/auth-and-roles.md. No customer-specific auth logic.

import { apiRequest } from './client';

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
}

export function verifyOtp(phone: string, code: string): Promise<{ access_token: string }> {
  return apiRequest('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false });
}
