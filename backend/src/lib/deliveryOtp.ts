// Delivery OTP — issued when an order goes out_for_delivery, matched when the
// rider marks it delivered, then consumed (column nulled) so it's single-use.
// Pure helpers so the security-adjacent match is unit-testable without the
// whole PATCH handler (backend/src/routes/orders.ts wires these in).

export function generateDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Exact match, and only when a code was actually issued — a null stored code
// (order predating the feature, or one that never went out_for_delivery) can
// never be satisfied by any input, so delivery stays blocked rather than
// silently open.
export function isDeliveryOtpValid(stored: string | null | undefined, provided: string | null | undefined): boolean {
  return !!stored && !!provided && stored === provided;
}
