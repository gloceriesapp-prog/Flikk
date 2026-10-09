'use client';

// Record one manual payout (backend/PAYOUTS.md). The founder has already
// paid in their UPI/bank app; this captures the UTR. If they tick the name
// check, the payee is marked verified first (with the name they saw), so
// the paid row's snapshot carries it. No optimistic state — the parent
// refetches on success.

import { useState } from 'react';
import { X } from 'lucide-react';
import { formatRupees } from '@/lib/format';
import { UTR_PATTERN } from '@/lib/payoutValidation';
import type { AdminPayoutRow } from '@/lib/types';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save. Try again.');
}

export function MarkPaidModal({ row, onClose, onPaid }: { row: AdminPayoutRow; onClose: () => void; onPaid: () => void }) {
  const [utr, setUtr] = useState('');
  const [mode, setMode] = useState<'upi' | 'bank_transfer'>(row.method === 'bank' ? 'bank_transfer' : 'upi');
  const [note, setNote] = useState('');
  const [nameMatched, setNameMatched] = useState(false);
  const [verifiedName, setVerifiedName] = useState(row.accountHolderName ?? row.verifiedName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanUtr = utr.trim().toUpperCase();
  const canSubmit = UTR_PATTERN.test(cleanUtr) && note.length <= 500 && (!nameMatched || verifiedName.trim().length >= 2) && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (nameMatched) {
        await postJson(`/api/payees/${row.kind}/${row.payeeId}/verification`, { verified: true, verifiedName: verifiedName.trim() });
      }
      await postJson(`/api/payouts/${row.kind}/${row.id}/mark-paid`, { utr: cleanUtr, mode, note: note.trim() || undefined });
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={submitting ? undefined : onClose}>
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Mark paid</h3>
          <button type="button" onClick={onClose} disabled={submitting} className="text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-sm">
            <p className="font-medium text-ink">{row.payeeName}</p>
            {row.method === 'upi' && <p className="text-ink-soft">UPI · {row.upiId ?? '—'}</p>}
            {row.method === 'bank' && (
              <p className="text-ink-soft">
                {row.accountHolderName ?? '—'} · A/c {row.accountNumber ?? '—'} · {row.ifsc ?? '—'}
                {row.bankName ? ` · ${row.bankName}` : ''}
              </p>
            )}
            {!row.method && <p className="text-danger">No payout details on file.</p>}
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{formatRupees(row.netAmount)}</p>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            UTR / bank reference
            <input value={utr} onChange={(e) => setUtr(e.target.value)} className={`${FIELD_CLASS} font-mono uppercase`} placeholder="e.g. 412345678901" autoFocus maxLength={35} />
            {utr && !UTR_PATTERN.test(cleanUtr) && <span className="text-xs font-normal text-danger">6–35 letters or digits.</span>}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as 'upi' | 'bank_transfer')} className={FIELD_CLASS}>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer (IMPS/NEFT)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Note (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className={FIELD_CLASS} rows={2} maxLength={500} />
          </label>

          {row.verification !== 'verified' && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border px-4 py-3">
              <label className="flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" checked={nameMatched} onChange={(e) => setNameMatched(e.target.checked)} className="mt-0.5" />
                <span>Name shown in UPI app/bank matched {row.accountHolderName ?? row.payeeName}</span>
              </label>
              {nameMatched && (
                <input value={verifiedName} onChange={(e) => setVerifiedName(e.target.value)} className={FIELD_CLASS} placeholder="Name exactly as shown" maxLength={100} />
              )}
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full bg-[#155DFC] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Saving…' : 'Mark paid'}
          </button>
        </div>
      </div>
    </div>
  );
}
