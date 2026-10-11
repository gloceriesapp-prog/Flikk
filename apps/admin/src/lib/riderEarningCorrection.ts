// Admin correction of one mis-recorded rider earning (money path). The actual
// amount update, settled-earning guard and append-only audit row live in the
// admin_correct_rider_earning RPC (migration 20261010120100). This file holds
// the rupees->paise parsing and the client-side bounds, so a fat-fingered
// amount is a 400 before the round-trip; the RPC re-checks everything
// server-side as the source of truth (including "below the extra-stop portion",
// which needs the locked row).

// Admin types the corrected TOTAL in rupees; the wire + DB are integer paise.
// rider_earnings.amount is numeric(10,2), so paise is exact. Rejects blanks,
// non-numeric, negative, and more than two decimals (0.001 rupees isn't a
// thing). Returns null on anything unparseable.
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const paise = Math.round(Number(trimmed) * 100);
  return Number.isSafeInteger(paise) ? paise : null;
}

export const MAX_CORRECTION_PAISE = 10_000_000; // ₹1,00,000 ceiling — matches the RPC.

export type CorrectionValidation = { ok: true; amountPaise: number; reason: string } | { ok: false; error: string };

// Same bounds as the RPC: amount a positive whole paise <= ceiling, reason
// 1-300 chars. (The "not below extra-stop portion" rule is enforced only by the
// RPC, which has the authoritative row.)
export function validateCorrectionInput(raw: { amountPaise?: unknown; reason?: unknown }): CorrectionValidation {
  const { amountPaise, reason } = raw;
  if (!Number.isSafeInteger(amountPaise) || (amountPaise as number) <= 0 || (amountPaise as number) > MAX_CORRECTION_PAISE) {
    return { ok: false, error: `Enter an amount between ₹0.01 and ₹${(MAX_CORRECTION_PAISE / 100).toLocaleString('en-IN')}.` };
  }
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 1 || text.length > 300) return { ok: false, error: 'A reason of 1–300 characters is required.' };
  return { ok: true, amountPaise: amountPaise as number, reason: text };
}

// Shape the RPC returns (jsonb). amounts are paise.
export interface CorrectionResult {
  earning_id: string;
  rider_id: string;
  old_amount_paise: number;
  new_amount_paise: number;
  delta_paise: number;
  was_settled: boolean;
  changed: boolean;
}
