// Mock auth — no backend/src/routes/rider.ts exists yet (only customer
// and partner have real auth routes today), so this isn't a "fallback"
// the way apps/partner/src/api/devAuthFallback.ts is (that one stands in
// only when a REAL endpoint is unreachable). Here there is no real
// endpoint to call at all yet — per an explicit ask, any phone number and
// any OTP code succeeds, no fixed demo code, no backend round trip.
//
// Kept in this exact shape (requestOtp/verifyOtp, async, same param/return
// names a real /auth/otp/request + /auth/otp/verify pair would have) on
// purpose — swapping in the real backend later is rewriting the bodies of
// these two functions, not restructuring every screen that calls them.

export interface VerifyOtpResult {
  accessToken: string;
  phone: string;
}

// Simulated network latency so the loading states (PrimaryButton's own
// `loading` prop) are actually visible/testable, not just an instant
// no-op that make the UI look unfinished during a real demo.
const MOCK_LATENCY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestOtp(phone: string): Promise<{ ok: true }> {
  if (phone.trim().length !== 10) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }
  await delay(MOCK_LATENCY_MS);
  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  // Real length check (an OTP box UI that accepts a 1-digit "code" isn't a
  // realistic input to test against), but no actual code comparison —
  // every code of the right length succeeds, per the explicit ask.
  if (code.trim().length !== 6) {
    throw new Error('Enter the 6-digit code.');
  }
  await delay(MOCK_LATENCY_MS);
  // No real server session exists — the token just carries the phone
  // number back out, same shape useAuthStore already expects from a real
  // JWT (something to persist, something to identify "this session").
  return { accessToken: `mock-rider:${phone}`, phone };
}
