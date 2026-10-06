// One canonical phone form for the whole backend: E.164 `+91XXXXXXXXXX`.
// Every client (customer/partner/rider apps, admin) has historically sent
// the same number in different shapes — `+917975247012`, `917975247012`,
// bare `7975247012` — and because auth.ts stored/looked-up whatever raw
// string arrived, one real person fragmented into multiple users rows and
// phone lookups (partner-check) missed the row they wanted. Normalizing at
// the trust boundary is the fix: accept any of those shapes, always store
// and query the one canonical form.
import { AppError } from './errors.js';

export function normalizePhone(raw: unknown): string {
  if (typeof raw !== 'string') throw new AppError(400, 'INVALID_PHONE', 'Enter a valid 10-digit Indian mobile number.');
  const digits = raw.replace(/\D/g, ''); // drop +, spaces, dashes
  // Strip the 91 country code if the caller included it (12 digits, 91-led),
  // leaving the 10-digit local number either way.
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (local.length !== 10) {
    throw new AppError(400, 'INVALID_PHONE', 'Enter a valid 10-digit Indian mobile number.');
  }
  return `+91${local}`;
}

// The equivalent legacy shapes of a canonical number, for reading rows that
// predate normalization (stored as `+91…`, `91…`, or bare `…`). New writes
// only ever produce the canonical form; this is purely lookup tolerance.
export function phoneVariants(canonical: string): string[] {
  const local = canonical.slice(3); // '+91' -> 10 digits
  return [canonical, `91${local}`, local];
}
