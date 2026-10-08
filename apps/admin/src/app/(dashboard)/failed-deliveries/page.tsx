'use client';

// Failed deliveries — manual refund review. Every order a rider marked
// 'failed' after pickup: the customer paid at checkout but wasn't
// auto-refunded (policy is case-by-case). The founder reviews each and issues
// the refund here. Separate from Refunds (which is the provider refund_status
// board) — see /api/failed-deliveries/route.ts for why they must not merge.
// Styling mirrors the Refunds page: same table shell, same status pills.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote } from 'lucide-react';
import clsx from 'clsx';
import type { FailedDeliveryOrder } from '@/app/api/failed-deliveries/route';
import { formatCurrency } from '@/lib/format';

// Same pill styling as the Refunds page (a refund issued from here shows up on
// both boards once refund_status leaves 'none').
const STATUS_STYLE: Record<Exclude<FailedDeliveryOrder['refundStatus'], 'none'>, string> = {
  manual_required: 'bg-red-50 text-danger',
  failed: 'bg-red-50 text-danger',
  processing: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-success',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FailedDeliveriesPage() {
  const [orders, setOrders] = useState<FailedDeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  // Trip legs: the refund covers the shared trip payment, so the admin
  // confirms the amount (defaults to the trip total) before approving.
  const [tripRefund, setTripRefund] = useState<{ id: string; amount: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/failed-deliveries');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load failed deliveries.');
      setOrders(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load failed deliveries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function handleRefund(id: string, amountPaise?: number) {
    // Optimistic disable — the server guard + the unique refund job (with its
    // Cashfree idempotency key) are the real double-refund protection; this just stops a double-click racing itself.
    setRefundingId(id);
    setLoadError(null);
    try {
      const res = await fetch(`/api/failed-deliveries/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amountPaise === undefined ? {} : { amountPaise }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not issue refund.');
      setTripRefund(null);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not issue refund.');
    } finally {
      setRefundingId(null);
    }
  }

  const pendingCount = orders.filter((o) => o.refundStatus === 'none').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Failed deliveries</h1>
        <p className="text-sm text-muted">
          Orders the rider couldn&apos;t deliver after pickup — the customer paid and needs a manual refund review.{' '}
          {pendingCount > 0 ? `${pendingCount} awaiting a refund decision.` : 'Nothing awaiting a decision.'}
        </p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Failed at</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No failed deliveries.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link href={`/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
                    {order.tripId && (
                      <span className="mt-0.5 block text-[11px] font-normal text-blue-700">
                        Trip {order.tripId.slice(0, 6).toUpperCase()} · {order.tripLegs} shops
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div className="leading-tight">
                      <p className="text-ink">{order.customerName}</p>
                      <p className="text-xs tabular-nums text-muted">{order.customerPhone}</p>
                    </div>
                  </td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-muted">{order.storeName}</td>
                  <td className="px-4 py-3 text-ink">
                    <p>{order.riderName ?? '—'}</p>
                    {order.riderPhone && <p className="text-xs tabular-nums text-muted">{order.riderPhone}</p>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    {formatCurrency(order.amount)}
                    {order.tripTotal !== null && <span className="block text-xs text-muted">trip {formatCurrency(order.tripTotal)}</span>}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{order.reasonLabel}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{order.failedAt ? formatDate(order.failedAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {order.refundStatus === 'none' && tripRefund?.id === order.id ? (
                      <form
                        className="flex items-center justify-end gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const paise = Math.round(Number(tripRefund.amount) * 100);
                          if (!Number.isSafeInteger(paise) || paise <= 0) {
                            setLoadError('Enter the refund amount in rupees.');
                            return;
                          }
                          void handleRefund(order.id, paise);
                        }}
                      >
                        <span className="text-xs text-muted">₹</span>
                        <input
                          autoFocus
                          inputMode="decimal"
                          value={tripRefund.amount}
                          onChange={(e) => setTripRefund({ id: order.id, amount: e.target.value })}
                          aria-label="Trip refund amount in rupees"
                          className="w-24 rounded-full border border-border px-3 py-1.5 text-xs"
                        />
                        <button type="submit" disabled={refundingId === order.id}
                          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                          {refundingId === order.id ? 'Approving…' : 'Refund trip'}
                        </button>
                        <button type="button" onClick={() => setTripRefund(null)} className="text-xs text-muted hover:text-ink">Cancel</button>
                      </form>
                    ) : order.refundStatus === 'none' ? (
                      <button
                        type="button"
                        onClick={() => (order.tripId
                          ? setTripRefund({ id: order.id, amount: String(order.tripTotal ?? order.amount) })
                          : handleRefund(order.id))}
                        disabled={refundingId === order.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                      >
                        <Banknote size={13} />
                        {refundingId === order.id ? 'Issuing…' : order.tripId ? 'Refund trip…' : 'Issue refund'}
                      </button>
                    ) : (
                      <span
                        className={clsx(
                          'rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                          STATUS_STYLE[order.refundStatus],
                        )}
                      >
                        {order.refundStatus === 'completed'
                          ? 'refunded'
                          : order.refundStatus === 'manual_required'
                            ? 'manual refund — see Refunds'
                            : order.refundStatus}
                      </span>
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
