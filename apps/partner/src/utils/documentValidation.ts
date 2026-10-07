// Real format validation for FSSAI/PAN — NOT government-database
// verification (no such API is integrated, and adopting one just to
// check a document number would be a much bigger integration than this
// form needs). This catches real typos (wrong length, wrong character
// pattern) against the actual official formats, which is genuinely most
// of what "verification" protects against in practice — it is never
// shown to the owner as "government-verified," only as a real format
// check, so it can't be mistaken for something it isn't.

// PAN: 5 letters, 4 digits, 1 letter — e.g. ABCDE1234F. Real Income Tax
// Department format, unchanged for decades.
const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// FSSAI license/registration number: always exactly 14 digits, whether a
// registration (state-level, small business) or a full license.
const FSSAI_FORMAT = /^\d{14}$/;

export function isValidPanFormat(value: string): boolean {
  return PAN_FORMAT.test(value.trim().toUpperCase());
}

export function isValidFssaiFormat(value: string): boolean {
  return FSSAI_FORMAT.test(value.trim());
}
