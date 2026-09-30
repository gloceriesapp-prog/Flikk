'use client';

// Real refund visibility — every cancelled-and-paid order's own
// refund_status (backend/src/routes/orders.ts's cancel handler is the
// only writer), not a placeholder. 'failed' rows get a real Retry button
// (POST /api/orders/[id]/retry-refund) that actually calls Razorpay again
// via this app's own lib/razorpay/refund.ts — idempotency-checked there,
// so retrying an already-succeeded refund is a safe no-op, not a double
// charge.

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { RefundOrder } from '@/app/api/refunds/route';

const STATUS_STYLE: Record<RefundOrder['refundStatus'], string> = {
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

  const failedCount = refunds.filter((r) => r.refundStatus === 'failed').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Refunds</h1>
        <p className="text-sm text-muted">
          Every cancelled order that was paid online. {failedCount > 0 ? `${failedCount} need a retry.` : 'Nothing needs attention.'}
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : refunds.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No refunds yet.
                </td>
              </tr>
            ) : (
              refunds.map((refund) => (
                <tr key={refund.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-ink">{refund.orderNumber}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">₹{refund.total.toFixed(0)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{cancelReasonLabel(refund.cancelReason)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', STATUS_STYLE[refund.refundStatus])}>
                      {refund.refundStatus}
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
