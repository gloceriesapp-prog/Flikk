// Date-of-birth helpers for the Personal Details onboarding step. The
// three-box DD/MM/YYYY input composes to the "YYYY-MM-DD" string the
// backend expects, and the 18+ check mirrors routes/riderOnboarding.ts's
// own isAtLeastAge exactly (calendar age, not a 365×18 estimate) so the
// client never lets through a DOB the backend would then reject.

export const MIN_RIDER_AGE_YEARS = 18;

// '' unless day+month+year form a real calendar date (rejects 31 Feb,
// month 13, etc. via Date round-trip). Not padded on input — padded here.
export function composeDob(day: string, month: string, year: string): string {
  if (year.length !== 4 || day === '' || month === '') return '';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return '';
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  const iso = `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  const parsed = new Date(iso);
  // Round-trip guard: JS Date rolls 2024-02-31 forward to March, so a
  // composed string that doesn't survive the round trip wasn't a real date.
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) return '';
  return iso;
}

export function splitDob(iso: string): { day: string; month: string; year: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { day: '', month: '', year: '' };
  return { day: String(Number(m[3])), month: String(Number(m[2])), year: m[1]! };
}

export function isAtLeast18(iso: string, now: Date = new Date()): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthday = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthday) age -= 1;
  return age >= MIN_RIDER_AGE_YEARS;
}
