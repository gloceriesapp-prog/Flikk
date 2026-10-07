'use client';

// Real refund visibility — every cancelled/failed-and-paid order's own
// refund_status. 'failed' rows get Retry (POST /api/orders/[id]/retry-refund),
// which only re-queues the durable refund job; the backend worker is the one
// place that calls Cashfree, with a deterministic refund_id as idempotency key,
// so a retry can't double-refund. 'manual_required' rows (legacy-provider
// payments Cashfree can't refund) get "Mark refunded manually", which needs
// the bank/UPI reference of the payout the founder sent.

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { RefundOrder } from '@/app/api/refunds/route';
import { CASHFREE_DASHBOARD_URL } from '@/lib/types';

const STATUS_STYLE: Record<RefundOrder['refundStatus'], string> = {
  manual_required: 'bg-red-50 text-danger',
  failed: 'bg-red-50 text-danger',
  processing: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-success',
};

// Rider cancels store a stable CODE (backend/src/lib/cancelReasons.ts —
// itself mirrored from @gloceries/shared, which admin isn't a member of), so map
// it to a readable label here. Partner/customer cancels are still free text,
// which falls through unchanged.
const CANCEL_REASON_LABELS: Record<string, string> = {
  store_closed: 'Store is closed',
  store_out_of_stock: 'Store out of items',
  store_refused_handover: 'Store refused to hand over',
  long_wait_at_store: 'Waiting too long at store',
  vehicle_breakdown: 'Vehicle breakdown',
  unsafe_conditions: 'Unsafe to continue',
  other: 'Other',
};

function cancelReasonLabel(reason: string | null): string {
  if (!reason) return '—';
  return CANCEL_REASON_LABELS[reason] ?? reason;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/refunds');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load refunds.');
      setRefunds(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load refunds.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/orders/${id}/retry-refund`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Retry failed.');
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setRetryingId(null);
    }
  }

  async function handleManual(id: string) {
    setSavingManual(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/orders/${id}/manual-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: manualRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not record manual refund.');
      setManualId(null);
      setManualRef('');
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not record manual refund.');
    } finally {
      setSavingManual(false);
    }
  }

  const failedCount = refunds.filter((r) => r.refundStatus === 'failed').length;
  const manualCount = refunds.filter((r) => r.refundStatus === 'manual_required').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Refunds</h1>
        <p className="text-sm text-muted">
          Every cancelled or failed order that was paid online.{' '}
          {failedCount + manualCount === 0
            ? 'Nothing needs attention.'
            : [failedCount > 0 && `${failedCount} need a retry.`, manualCount > 0 && `${manualCount} need a manual refund.`].filter(Boolean).join(' ')}
        </p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : refunds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No refunds yet.
                </td>
              </tr>
            ) : (
              refunds.map((refund) => (
                <tr key={refund.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-ink">{refund.orderNumber}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">₹{refund.total.toFixed(0)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{cancelReasonLabel(refund.cancelReason)}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <p className="font-semibold capitalize text-ink">
                      {refund.paymentProvider === 'cashfree' ? 'Cashfree' : 'Legacy provider'}
                    </p>
                    {refund.providerOrderId && refund.paymentProvider === 'cashfree' ? (
                      <a
                        href={CASHFREE_DASHBOARD_URL}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Cashfree dashboard — search Payments by this order id"
                        className="inline-flex items-center gap-1 font-mono hover:text-ink"
                      >
                        {refund.providerOrderId}
                        <ExternalLink size={11} />
                      </a>
                    ) : null}
                    {refund.providerPaymentId && <p className="font-mono">pay: {refund.providerPaymentId}</p>}
                    {refund.providerRefundId && <p className="font-mono">ref: {refund.providerRefundId}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', STATUS_STYLE[refund.refundStatus])}>
                      {refund.refundStatus === 'manual_required' ? 'manual refund needed' : refund.refundStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {refund.refundStatus === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(refund.id)}
                        disabled={retryingId === refund.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent/50 disabled:opacity-50"
                      >
                        <RotateCcw size={13} className={retryingId === refund.id ? 'animate-spin' : ''} />
                        {retryingId === refund.id ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                    {refund.refundStatus === 'manual_required' &&
                      (manualId === refund.id ? (
                        <form
                          className="flex items-center justify-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void handleManual(refund.id);
                          }}
                        >
                          <input
                            autoFocus
                            required
                            minLength={4}
                            maxLength={64}
                            value={manualRef}
                            onChange={(e) => setManualRef(e.target.value)}
                            placeholder="Bank/UPI reference (UTR)"
                            aria-label="Bank or UPI reference"
                            className="w-48 rounded-full border border-border px-3 py-1.5 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={savingManual || manualRef.trim().length < 4}
                            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {savingManual ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setManualId(null);
                              setManualRef('');
                            }}
                            className="text-xs text-muted hover:text-ink"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setManualId(refund.id);
                            setManualRef('');
                          }}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent/50"
                        >
                          Mark refunded manually
                        </button>
                      ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
