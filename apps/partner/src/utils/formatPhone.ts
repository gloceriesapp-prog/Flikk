// "919876543210" -> "+91 98765 43210" — readable Indian mobile grouping.
// Falls back to the raw value untouched if it doesn't match the expected
// shape (e.g. a dev-mode fake phone) rather than mangling something it
// doesn't recognize. Shared by StoreReviewScreen (onboarding) and
// StoreSettingsScreen (post-approval) — same account phone, same format.
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : null;
  if (!local) return raw;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
