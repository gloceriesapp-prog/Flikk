'use client';

// Real refund visibility — every cancelled/failed-and-paid order's own
// refund_status. 'failed' rows get Retry (POST /api/orders/[id]/retry-refund),
// which only re-queues the durable refund job; the backend worker is the one
// place that calls Cashfree, with a deterministic refund_id as idempotency key,
// so a retry can't double-refund. 'manual_required' rows (legacy-provider
// payments Cashfree can't refund) get "Mark refunded manually", which needs
// the bank/UPI reference of the payout the founder sent.
// Trip legs share one combined refund (trip_refunds), shown in the "Trip
// refunds" section below with its legs; its manual refund closes every leg.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { RefundOrder } from '@/app/api/refunds/route';
import type { TripRefundRow } from '@/app/api/refunds/trips/route';
import { CASHFREE_DASHBOARD_URL } from '@/lib/types';
import { cancelReasonLabel } from '@/lib/orders/cancelReasons';
import { formatDateTime } from '@/lib/format';

const STATUS_STYLE: Record<RefundOrder['refundStatus'], string> = {
  manual_required: 'bg-red-50 text-danger',
  failed: 'bg-red-50 text-danger',
  processing: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-success',
};

const TRIP_STATUS_STYLE: Record<TripRefundRow['status'], string> = {
  manual_required: 'bg-red-50 text-danger',
  failed: 'bg-red-50 text-danger',
  queued: 'bg-amber-50 text-amber-600',
  processing: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-success',
};

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [tripRefunds, setTripRefunds] = useState<TripRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [res, tripRes] = await Promise.all([fetch('/api/refunds'), fetch('/api/refunds/trips')]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load refunds.');
      const tripData = await tripRes.json();
      if (!tripRes.ok) throw new Error(tripData.error ?? 'Could not load trip refunds.');
      setRefunds(data);
      setTripRefunds(tripData);
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

  const singles = refunds.filter((r) => !r.tripId);
  const failedCount = singles.filter((r) => r.refundStatus === 'failed').length;
  const manualCount = singles.filter((r) => r.refundStatus === 'manual_required').length
    + tripRefunds.filter((t) => t.status === 'manual_required').length;

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
                  <td className="px-4 py-3 font-medium text-ink">
                    {refund.orderNumber}
                    {refund.tripId && <span className="block text-[11px] font-normal text-blue-700">Trip leg — see Trip refunds</span>}
                  </td>
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
                    {!refund.tripId && refund.refundStatus === 'failed' && (
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
                    {!refund.tripId && refund.refundStatus === 'manual_required' &&
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

      <div>
        <h2 className="text-xl font-bold text-ink">Trip refunds</h2>
        <p className="text-sm text-muted">One combined refund per multi-shop trip (cancelled trips and approved failed-delivery refunds).</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-accent/40 text-left text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Shops</th>
              <th className="px-4 py-3">Refund</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!loading && tripRefunds.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No trip refunds yet.</td>
              </tr>
            )}
            {tripRefunds.map((trip) => {
              const manualLeg = trip.legs.find((leg) => leg.refundStatus === 'manual_required');
              return (
                <tr key={trip.tripId} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-ink">
                    <p className="font-mono text-xs">{trip.tripId.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs capitalize text-muted">trip {trip.tripStatus} · ₹{trip.tripTotal.toFixed(0)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {trip.legs.map((leg) => (
                      <p key={leg.id}>
                        <Link href={`/orders/${leg.id}`} className="font-medium text-ink hover:underline">{leg.orderNumber}</Link>
                        {' '}· {leg.storeName} · {leg.status}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    ₹{(trip.targetPaise / 100).toFixed(2)}
                    {trip.refundedPaise > 0 && <span className="block text-xs text-muted">refunded ₹{(trip.refundedPaise / 100).toFixed(2)}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <p className="font-semibold text-ink">{trip.paymentProvider === 'razorpay' ? 'Legacy provider' : 'Cashfree'}</p>
                    <p className="font-mono">pay: {trip.paymentId}</p>
                    {trip.providerRefundId && <p className="font-mono">ref: {trip.providerRefundId}</p>}
                    {trip.lastError && <p>{trip.lastError}</p>}
                    <p>updated {formatDateTime(trip.updatedAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', TRIP_STATUS_STYLE[trip.status])}>
                      {trip.status === 'manual_required' ? 'manual refund needed' : trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {trip.status === 'manual_required' && manualLeg &&
                      (manualId === manualLeg.id ? (
                        <form
                          className="flex items-center justify-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void handleManual(manualLeg.id);
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
                          <button type="submit" disabled={savingManual || manualRef.trim().length < 4}
                            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                            {savingManual ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => { setManualId(null); setManualRef(''); }} className="text-xs text-muted hover:text-ink">
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setManualId(manualLeg.id); setManualRef(''); }}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent/50"
                        >
                          Mark refunded manually
                        </button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
