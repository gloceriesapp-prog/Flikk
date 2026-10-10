'use client';

// Correct one mis-recorded rider earning (money path, admin-only). The founder
// enters the corrected TOTAL in rupees plus a required reason; the API converts
// to integer paise and calls admin_correct_rider_earning, which audits
// old/new/delta. A settled (paid-out) earning needs the explicit override tick
// — the cash already left. No optimistic state: the parent refetches on
// success. Mirrors MarkPaidModal (confirmation + double-submit guard).

import { useState } from 'react';
import { X } from 'lucide-react';
import { formatRupees } from '@/lib/format';
import { rupeesToPaise, validateCorrectionInput, type CorrectionResult } from '@/lib/riderEarningCorrection';
import type { RiderEarningRow } from '@/lib/types';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function CorrectEarningModal({ row, onClose, onCorrected }: { row: RiderEarningRow; onClose: () => void; onCorrected: () => void }) {
  const settled = row.status !== 'unpaid';
  const [amount, setAmount] = useState(row.amount.toFixed(2));
  const [reason, setReason] = useState('');
  const [allowSettled, setAllowSettled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CorrectionResult | null>(null);

  const paise = rupeesToPaise(amount);
  const oldPaise = Math.round(row.amount * 100);
  const extraPaise = Math.round(row.extraStopAmount * 100);
  const validated = paise == null ? { ok: false as const, error: '' } : validateCorrectionInput({ amountPaise: paise, reason });
  const belowExtra = paise != null && paise < extraPaise;
  const noChange = paise != null && paise === oldPaise;
  const canSubmit = validated.ok && !belowExtra && !noChange && (!settled || allowSettled) && !submitting;

  async function handleSubmit() {
    if (paise == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rider-earnings/${row.id}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise: paise, reason: reason.trim(), allowSettled: settled ? allowSettled : false }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Could not correct this earning.');
      setDone(data as CorrectionResult);
      onCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not correct this earning.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={submitting ? undefined : onClose}>
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Correct earning</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-sm">
              {done.changed ? (
                <>
                  <p className="text-ink-soft">Corrected and recorded in the audit log.</p>
                  <p className="mt-1 text-ink">
                    <span className="tabular-nums line-through">{formatRupees(done.old_amount_paise / 100)}</span>{' '}
                    → <span className="font-semibold tabular-nums">{formatRupees(done.new_amount_paise / 100)}</span>{' '}
                    <span className={done.delta_paise >= 0 ? 'text-success' : 'text-danger'}>
                      ({done.delta_paise >= 0 ? '+' : ''}{formatRupees(done.delta_paise / 100)})
                    </span>
                  </p>
                  {done.was_settled && <p className="mt-1 text-xs text-amber-700">This was already paid out — settle the difference manually on the Payouts side.</p>}
                </>
              ) : (
                <p className="text-ink-soft">No change — the amount was already {formatRupees(done.old_amount_paise / 100)}.</p>
              )}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-sm">
                <p className="font-medium text-ink">{row.riderName}</p>
                <p className="text-ink-soft">
                  {row.tripId ? 'Trip' : 'Order'} #{(row.tripId ?? row.orderId).slice(0, 6).toUpperCase()} · base {formatRupees(row.baseAmount)} + extra {formatRupees(row.extraStopAmount)}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{formatRupees(row.amount)}</p>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Corrected total (₹)
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={`${FIELD_CLASS} tabular-nums`} placeholder="e.g. 55.00" autoFocus maxLength={12} />
                {amount.trim() !== '' && paise == null && <span className="text-xs font-normal text-danger">Enter rupees, up to two decimals.</span>}
                {belowExtra && <span className="text-xs font-normal text-danger">Can’t be below the extra-stop portion ({formatRupees(row.extraStopAmount)}).</span>}
                {noChange && <span className="text-xs font-normal text-muted">Same as the current amount — nothing to change.</span>}
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Reason (recorded in the audit log)
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_CLASS} rows={2} maxLength={300} placeholder="e.g. extra-stop fee double-counted" />
              </label>

              {settled && (
                <label className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <input type="checkbox" checked={allowSettled} onChange={(e) => setAllowSettled(e.target.checked)} className="mt-0.5" />
                  <span>This earning is already {row.status === 'paid' ? 'paid out' : 'in a payout'}. Correct it anyway — I’ll reconcile the cash difference manually.</span>
                </label>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button type="button" onClick={onClose} disabled={submitting} className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink">Cancel</button>
              <button type="button" onClick={handleSubmit} disabled={!canSubmit}
                className="rounded-full bg-[#155DFC] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                {submitting ? 'Saving…' : 'Correct earning'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
