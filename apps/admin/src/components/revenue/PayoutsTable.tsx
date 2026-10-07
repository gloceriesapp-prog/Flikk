'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/format';
import type { Payout, PayoutDestination } from '@/lib/types';

// onMarkPaid present → pending rows get a "Mark paid" action that asks for
// the bank reference (UTR) of the transfer the founder just made.
export function PayoutsTable({
  payouts,
  emptyLabel,
  onMarkPaid,
}: {
  payouts: Payout[];
  emptyLabel: string;
  onMarkPaid?: (id: string, reference: string) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-3 pr-4 font-medium">Store</th>
            <th className="pb-3 pr-4 font-medium">Cycle</th>
            <th className="pb-3 pr-4 font-medium">Gross sales</th>
            <th className="pb-3 pr-4 font-medium">Commission</th>
            <th className="pb-3 pr-4 font-medium">Net payout</th>
            <th className="pb-3 pr-4 font-medium">Pay to</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b border-border align-top last:border-0">
              <td className="py-3 pr-4 font-medium text-ink">{payout.storeName}</td>
              <td className="py-3 pr-4 text-ink-soft">{payout.cycleLabel}</td>
              <td className="py-3 pr-4 tabular-nums text-ink-soft">{formatCurrency(payout.grossSales)}</td>
              <td className="py-3 pr-4 tabular-nums text-ink-soft">
                {formatCurrency(payout.grossSales - payout.netPayout)}
                <span className="pl-1 text-xs text-muted">({Math.round(payout.commissionRate * 100)}%)</span>
              </td>
              <td className="py-3 pr-4 font-semibold tabular-nums text-ink">{formatCurrency(payout.netPayout)}</td>
              <td className="py-3 pr-4 text-ink-soft">
                <Destination destination={payout.destination} />
              </td>
              <td className="py-3">
                {payout.status === 'paid' ? (
                  <div className="flex flex-col gap-1">
                    <span className="self-start rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">
                      Paid · {payout.paidAt}
                    </span>
                    {payout.paymentReference && <span className="text-xs text-muted">Ref {payout.paymentReference}</span>}
                  </div>
                ) : onMarkPaid && payout.destination ? (
                  <MarkPaid onSubmit={(reference) => onMarkPaid(payout.id, reference)} />
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {payout.destination ? 'Pending' : 'No payout account'}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {payouts.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-sm text-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Destination({ destination }: { destination: PayoutDestination | null }) {
  if (!destination) return <span className="text-xs text-muted">Store hasn&apos;t added one</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-ink">
        {destination.method === 'upi' ? destination.upiId : `${destination.accountNumber} · ${destination.ifsc}`}
      </span>
      {destination.holderName && <span className="text-xs">{destination.holderName}</span>}
      {!destination.verified && (
        <span className="text-[11px] font-medium text-amber-700">Not verified — check the name your app shows before sending</span>
      )}
    </div>
  );
}

export function MarkPaid({ onSubmit }: { onSubmit: (reference: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
      >
        Mark paid
      </button>
    );
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(reference.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark paid.');
      setSaving(false);
    }
  }

  return (
    <div className="flex w-56 flex-col gap-1.5">
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="UTR / UPI transaction ID"
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs"
        autoFocus
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={saving || reference.trim().length < 6}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Confirm paid'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={saving} className="px-2 text-xs text-muted">
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
