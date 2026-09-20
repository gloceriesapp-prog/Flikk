// Real format validation only, not government-database or Razorpay
// verification — Razorpay has no standalone "verify this PAN/FSSAI is
// real" API outside their full Route sub-merchant onboarding product, a
// different payout architecture than this app's own RazorpayX Fund
// Account model (payments/verifyPayoutAccount.ts). Shared by
// storeOnboarding.ts (Step 2 of onboarding) and partner.ts (Store
// settings PATCH) so both real entry points for these fields enforce the
// exact same rule — same reasoning as apps/partner's own client-side copy
// of these regexes (utils/documentValidation.ts).

const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const FSSAI_FORMAT = /^\d{14}$/;

export function isValidPanFormat(value: string): boolean {
  return PAN_FORMAT.test(value.trim().toUpperCase());
}

export function isValidFssaiFormat(value: string): boolean {
  return FSSAI_FORMAT.test(value.trim());
}
