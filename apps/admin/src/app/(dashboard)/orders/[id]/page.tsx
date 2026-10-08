'use client';

// Admin order detail (GET /api/orders/[id]) and the admin actions on it.
// Every action asks for a reason and an explicit confirmation, then calls an
// audited migration 109 RPC through its admin route:
//   cancel           POST /api/orders/[id]/cancel           (whole trip for a trip leg)
//   forward status   POST /api/orders/[id]/status           (placed->packed, packed->picked up)
//   unassign rider   POST /api/orders/[id]/unassign-rider
//   reassign rider   POST /api/orders/[id]/reassign-rider   (trip-wide)
//   delivery code    POST /api/orders/[id]/delivery-code/reissue

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { StatusPill } from '@/components/ui/StatusPill';
import { RiderSelect } from '@/components/dispatch/RiderSelect';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { CANCELLED_BY_LABELS, orderReasonLabel } from '@/lib/orders/cancelReasons';
import type { OrderDetail } from '@/lib/orders/orderDetail';
import type { ActiveRider } from '@/lib/types';

type ActionKind = 'cancel' | 'packed' | 'out_for_delivery' | 'unassign' | 'reassign' | 'reissue';

const ACTION_COPY: Record<ActionKind, { title: string; confirm: string; danger?: boolean; needsReason: boolean }> = {
  cancel: { title: 'Cancel order', confirm: 'Cancel order', danger: true, needsReason: true },
  packed: { title: 'Mark packed', confirm: 'Mark packed', needsReason: true },
  out_for_delivery: { title: 'Mark picked up', confirm: 'Mark picked up', needsReason: true },
  unassign: { title: 'Remove rider', confirm: 'Remove rider', danger: true, needsReason: true },
  reassign: { title: 'Reassign rider', confirm: 'Reassign', needsReason: true },
  reissue: { title: 'Reissue delivery code', confirm: 'Reissue code', needsReason: false },
};

const CODE_STATE_LABEL: Record<OrderDetail['deliveryCode']['state'], string> = {
  none: 'No code issued',
  active: 'Active',
  expired: 'Expired',
  locked: 'Locked (too many wrong attempts)',
  used: 'Used',
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-3xl border border-border bg-card p-5 shadow-sm', className)}>
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState('');
  const [riderId, setRiderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load this order.');
      setOrder(body as OrderDetail);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load this order.');
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  useEffect(() => {
    fetch('/api/riders')
      .then((res) => (res.ok ? res.json() : []))
      .then(setRiders)
      .catch(() => setRiders([]));
  }, []);

  function openAction(kind: ActionKind) {
    setAction(kind);
    setReason('');
    setRiderId('');
    setActionError(null);
    setNotice(null);
  }

  async function runAction() {
    if (!action || busy) return;
    const copy = ACTION_COPY[action];
    if (copy.needsReason && reason.trim().length < 3) {
      setActionError('Enter a reason (at least 3 characters).');
      return;
    }
    if (action === 'reassign' && !riderId) {
      setActionError('Pick the new rider.');
      return;
    }
    const request: Record<ActionKind, [string, Record<string, unknown>]> = {
      cancel: [`/api/orders/${id}/cancel`, { reason }],
      packed: [`/api/orders/${id}/status`, { to: 'packed', reason }],
      out_for_delivery: [`/api/orders/${id}/status`, { to: 'out_for_delivery', reason }],
      unassign: [`/api/orders/${id}/unassign-rider`, { reason }],
      reassign: [`/api/orders/${id}/reassign-rider`, { riderId, reason }],
      reissue: [`/api/orders/${id}/delivery-code/reissue`, {}],
    };
    const [url, body] = request[action];
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error ?? 'That action failed.');
      setNotice(action === 'reissue' ? 'A new delivery code was issued. The customer sees it in their app.' : `${copy.title}: done.`);
      setAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !order) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/orders" className="flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Orders</Link>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }
  if (!order) return <p className="text-sm text-muted">Loading…</p>;

  const prePickup = order.status === 'placed' || order.status === 'packed';
  const tripPickedUp = order.trip?.legs.some((leg) => ['out_for_delivery', 'delivered', 'failed'].includes(leg.status)) ?? false;
  const canCancel = order.trip ? !tripPickedUp && order.trip.legs.some((leg) => leg.status === 'placed' || leg.status === 'packed') : prePickup;
  const canChangeRider = prePickup && !tripPickedUp && !!order.rider;
  const isTrip = !!order.trip;
  const code = order.deliveryCode;

  const actions: { kind: ActionKind; show: boolean }[] = [
    { kind: 'packed', show: order.status === 'placed' },
    { kind: 'out_for_delivery', show: order.status === 'packed' && !!order.rider },
    { kind: 'reassign', show: canChangeRider },
    { kind: 'unassign', show: canChangeRider },
    { kind: 'reissue', show: code.canReissue },
    { kind: 'cancel', show: canCancel },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Orders</Link>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-ink">
            {order.orderNumber}
            <StatusPill status={order.status} />
          </h1>
          <p className="text-sm text-muted">
            Placed {formatDateTime(order.placedAt)} · <span className="font-mono text-xs">{order.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.filter((a) => a.show).map(({ kind }) => (
            <button
              key={kind}
              type="button"
              onClick={() => openAction(kind)}
              className={clsx(
                'rounded-full px-4 py-2 text-xs font-semibold',
                ACTION_COPY[kind].danger ? 'border border-danger/40 text-danger hover:bg-red-50' : 'border border-border text-ink hover:bg-canvas',
              )}
            >
              {ACTION_COPY[kind].title}
            </button>
          ))}
        </div>
      </div>

      {notice && <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-success">{notice}</p>}

      {action && (
        <div role="dialog" aria-label={ACTION_COPY[action].title} className="rounded-3xl border-2 border-ink/10 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">{ACTION_COPY[action].title}?</h3>
          <p className="mt-1 text-xs text-muted">
            {action === 'cancel' && (isTrip
              ? `This cancels the whole trip (${order.trip!.legs.length} shops), releases stock and starts one refund for the shared payment.`
              : 'Stock is released and, for an online payment, the refund starts automatically. The customer is notified.')}
            {action === 'packed' && 'Use this when the shop packed the order but could not mark it in the app. Riders nearby are offered it next.'}
            {action === 'out_for_delivery' && 'Use this when the rider collected the order but their app could not record the pickup.'}
            {action === 'unassign' && (isTrip ? 'The rider is removed from every stop of this trip and it is offered to riders again.' : 'The rider is removed and the order is offered to riders again.')}
            {action === 'reassign' && (isTrip ? 'Every stop of this trip moves to the new rider.' : 'The order moves to the new rider.')}
            {action === 'reissue' && 'Issues a fresh 4-digit code (valid 2 hours) and resets wrong attempts. Only the customer can see the code.'}
          </p>
          {action === 'reassign' && (
            <div className="mt-3">
              <RiderSelect riders={riders} value={riderId} onChange={setRiderId} disabled={busy} excludeUserIds={order.rider ? [order.rider.userId] : []} />
            </div>
          )}
          {ACTION_COPY[action].needsReason && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Reason (kept in the audit log)"
              aria-label="Reason"
              className="mt-3 w-full rounded-2xl border border-border bg-canvas px-3 py-2 text-sm text-ink focus:outline-none"
            />
          )}
          {actionError && <p className="mt-2 text-xs font-medium text-danger">{actionError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runAction}
              className={clsx('rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-40', ACTION_COPY[action].danger ? 'bg-danger' : 'bg-ink')}
            >
              {busy ? 'Working…' : ACTION_COPY[action].confirm}
            </button>
            <button type="button" disabled={busy} onClick={() => setAction(null)} className="rounded-full px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink">
              Keep as is
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Section title={`Items (${order.items.length})`}>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-ink">{item.name}{item.unit && <span className="text-xs text-muted"> · {item.unit}</span>}</td>
                    <td className="py-2 pr-3 text-ink-soft">× {item.quantity}</td>
                    <td className="py-2 text-right tabular-nums text-ink">{formatCurrency(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 border-t border-border pt-2">
              <Row label="Items">{formatCurrency(order.itemTotal)}</Row>
              <Row label="Delivery fee">{formatCurrency(order.deliveryFee)}</Row>
              <Row label="Handling fee">{formatCurrency(order.handlingFee)}</Row>
              {order.discountAmount > 0 && <Row label={`Discount${order.promo ? ` (${order.promo.code})` : ''}`}>− {formatCurrency(order.discountAmount)}</Row>}
              <Row label="Total"><strong>{formatCurrency(order.total)}</strong></Row>
              <Row label="Commission">{formatCurrency(order.commissionAmount)}</Row>
            </div>
          </Section>

          {order.trip && (
            <Section title={`Trip · ${order.trip.legs.length} shops`}>
              <p className="mb-2 text-xs text-muted">
                Trip <span className="font-mono">{order.trip.id}</span> · {order.trip.status} · total {formatCurrency(order.trip.total)} · delivery {formatCurrency(order.trip.deliveryFee)}
              </p>
              {order.trip.cancelOriginOrderId && (
                <p className="mb-2 rounded-2xl bg-red-50 px-3 py-2 text-xs text-danger">
                  Whole trip cancelled by {CANCELLED_BY_LABELS[order.trip.cancelledBy ?? ''] ?? 'unknown'} because of {order.trip.cancelOriginStoreName ?? 'one shop'}
                  {' '}(<Link className="underline" href={`/orders/${order.trip.cancelOriginOrderId}`}>that shop&apos;s order</Link>).
                </p>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {order.trip.legs.map((leg) => (
                    <tr key={leg.id} className={clsx('border-b border-border last:border-0', leg.id === order.id && 'bg-canvas')}>
                      <td className="py-2 pr-3">
                        <Link href={`/orders/${leg.id}`} className="font-medium text-ink hover:underline">{leg.orderNumber}</Link>
                        <span className="block text-xs text-muted">{leg.storeName}</span>
                      </td>
                      <td className="py-2 pr-3"><StatusPill status={leg.status} /></td>
                      <td className="py-2 pr-3 text-xs text-muted">{leg.status === 'cancelled' || leg.status === 'failed' ? orderReasonLabel(leg.status, leg.cancelReason) : ''}</td>
                      <td className="py-2 text-right tabular-nums text-ink">{formatCurrency(leg.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <Section title="Timeline">
            <ol className="flex flex-col gap-3">
              {order.timeline.map((event, i) => (
                <li key={`${event.at}-${i}`} className="flex gap-3 text-sm">
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', event.kind === 'admin' ? 'bg-amber-500' : 'bg-ink')} />
                  <div>
                    <p className="text-ink">{event.label}</p>
                    <p className="text-xs text-muted">{formatDateTime(event.at)}{event.detail ? ` · ${event.detail}` : ''}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          {(order.status === 'cancelled' || order.status === 'failed') && (
            <Section title={order.status === 'failed' ? 'Delivery failure' : 'Cancellation'}>
              <Row label="Reason">{orderReasonLabel(order.status, order.cancelReason)}</Row>
              {order.cancelReason && orderReasonLabel(order.status, order.cancelReason) !== order.cancelReason && <Row label="Code">{order.cancelReason}</Row>}
              <Row label="By">{order.cancelledBy ? CANCELLED_BY_LABELS[order.cancelledBy] ?? order.cancelledBy : '—'}</Row>
            </Section>
          )}

          <Section title="Customer">
            <Row label="Name">{order.customer.name ?? '—'}</Row>
            <Row label="Phone">{order.customer.phone ?? '—'}</Row>
            {order.address && (
              <>
                <Row label="Address">{order.address.text}</Row>
                {order.address.recipientName && <Row label="Recipient">{order.address.recipientName} {order.address.recipientPhone ?? ''}</Row>}
                {order.address.instructions && <Row label="Instructions">{order.address.instructions}</Row>}
              </>
            )}
          </Section>

          <Section title="Store">
            <Row label="Name">{order.store.name}</Row>
            <Row label="Phone">{order.store.phone ?? '—'}</Row>
            {order.store.district && <Row label="District">{order.store.district}</Row>}
          </Section>

          <Section title="Rider">
            {order.rider ? (
              <>
                <Row label="Name">{order.rider.name ?? 'Unknown rider'}</Row>
                <Row label="Phone">{order.rider.phone ?? '—'}</Row>
                <Row label="Presence">{order.rider.presence ?? '—'}</Row>
                <Row label="Last ping">{order.rider.lastSeenAt ? formatRelativeTime(order.rider.lastSeenAt) : 'never'}</Row>
              </>
            ) : (
              <p className="text-sm text-muted">
                No rider assigned. {order.status === 'packed' && <Link href="/riders" className="underline">Assign from Riders</Link>}
              </p>
            )}
          </Section>

          <Section title="Payment">
            <Row label="Method">{order.payment.method === 'online' ? `Online${order.payment.provider ? ` (${order.payment.provider})` : ''}` : 'Cash on delivery'}</Row>
            {order.payment.method === 'online' && <Row label="Payment id">{order.payment.providerPaymentId ?? 'Not paid'}</Row>}
            <Row label="Refund">{order.payment.refundStatus === 'manual_required' ? 'manual refund needed' : order.payment.refundStatus}</Row>
            {order.payment.providerRefundId && <Row label="Refund ref">{order.payment.providerRefundId}</Row>}
            {order.payment.refundedAt && <Row label="Refunded">{formatDateTime(order.payment.refundedAt)}</Row>}
            {order.payment.refundJob && (
              <Row label={order.payment.refundJob.scope === 'trip' ? 'Trip refund' : 'Refund job'}>
                {order.payment.refundJob.status} · {formatCurrency(order.payment.refundJob.targetPaise / 100)}
                {order.payment.refundJob.lastError && <span className="block text-xs text-muted">{order.payment.refundJob.lastError}</span>}
              </Row>
            )}
          </Section>

          <Section title="Delivery code">
            <Row label="State">{CODE_STATE_LABEL[code.state]}</Row>
            {code.exists && (
              <>
                <Row label="Wrong attempts">{code.attempts} / {code.maxAttempts}</Row>
                <Row label={code.state === 'expired' ? 'Expired' : 'Expires'}>{code.expiresAt ? formatDateTime(code.expiresAt) : '—'}</Row>
                {code.consumedAt && <Row label="Used">{formatDateTime(code.consumedAt)}</Row>}
              </>
            )}
            <Row label="Reissued">{code.resets === 0 ? 'never' : `${code.resets}× · last ${formatDateTime(code.lastResetAt!)}`}</Row>
            {code.canReissue ? (
              <button type="button" onClick={() => openAction('reissue')}
                className="mt-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas">
                Reissue delivery code
              </button>
            ) : (
              <p className="mt-2 text-xs text-muted">A code can be reissued only while the order is out for delivery.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
