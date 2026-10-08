'use client';

// The store's real payout destination (masked) + verification status, with
// an admin set/replace form. See app/api/stores/[id]/payout-account/route.ts.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StorePayoutView } from '@/lib/storePayout';

const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/15';

export function StorePayoutPanel({ storeId, payout }: { storeId: string; payout: StorePayoutView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<'upi' | 'bank'>(payout.method ?? 'upi');
  const [upiId, setUpiId] = useState('');
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (payout.method && !window.confirm('Replace this store’s payout details? Verification resets and the partner sees the new destination.')) return;
    setSaving(true);
    setError(null);
    try {
      const body =
        method === 'upi'
          ? { method, upiId }
          : { method, accountHolderName: holder, accountNumber: account, ifsc, bankName: bankName || undefined };
      const res = await fetch(`/api/stores/${storeId}/payout-account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save the payout account.');
      setEditing(false);
      setAccount('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the payout account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Payout account</h2>
          <p className="mt-1 text-sm text-muted">Where this store&apos;s weekly payouts are sent. Partners set this in their app; you can set it here too.</p>
        </div>
        {payout.method && (
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${payout.status === 'verified' ? 'bg-green-50 text-success' : 'bg-amber-50 text-amber-700'}`}>
            {payout.status === 'verified' ? 'Verified' : 'Not verified'}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-accent/40 px-4 py-3 text-sm">
        {payout.method === 'upi' && <p className="text-ink">UPI · {payout.upiId}</p>}
        {payout.method === 'bank' && (
          <p className="text-ink">
            {payout.accountHolderName ?? '—'} · A/c ····{payout.accountLast4 ?? '—'} · {payout.ifsc ?? '—'}
            {payout.bankName ? ` · ${payout.bankName}` : ''}
            {!payout.hasProof && <span className="text-muted"> · no cheque/passbook proof (set by admin)</span>}
          </p>
        )}
        {!payout.method && <p className="text-danger">No payout account on file — payouts for this store cannot be marked paid.</p>}
        {payout.status === 'verified' && payout.verifiedName && (
          <p className="mt-1 text-xs text-muted">Name seen in UPI/bank app: {payout.verifiedName}</p>
        )}
        {payout.method && payout.status !== 'verified' && (
          <p className="mt-1 text-xs text-muted">
            Verify the account holder name when paying from the <Link href="/payouts" className="underline">Payouts</Link> page.
          </p>
        )}
      </div>

      {!editing ? (
        <button type="button" onClick={() => setEditing(true)} className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink">
          {payout.method ? 'Replace payout account' : 'Set payout account'}
        </button>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            {(['upi', 'bank'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${method === m ? 'bg-ink text-white' : 'border border-border text-ink'}`}
              >
                {m === 'upi' ? 'UPI' : 'Bank account'}
              </button>
            ))}
          </div>
          {method === 'upi' ? (
            <input className={inputClass} placeholder="name@okaxis" value={upiId} onChange={(e) => setUpiId(e.target.value)} maxLength={321} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputClass} placeholder="Account holder name" value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={100} />
              <input className={inputClass} placeholder="Account number" inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value)} maxLength={18} />
              <input className={`${inputClass} uppercase`} placeholder="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value)} maxLength={11} />
              <input className={inputClass} placeholder="Bank name (optional)" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} />
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? 'Saving…' : 'Save payout account'}
            </button>
            <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
