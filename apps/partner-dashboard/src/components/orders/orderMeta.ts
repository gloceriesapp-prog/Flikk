import { useEffect, useState } from 'react';
import type { OrderStatus, PartnerOrder } from '@/lib/partnerApi';

// One source of truth for how an order status looks on the Orders page —
// the summary strip, tabs, cards, table and details panel all read this so a
// "Packed" order is the same amber everywhere. 'placed' reads as "New" here:
// to the owner it is the order waiting for them, not a past event.
export const STATUS_META: Record<OrderStatus, { label: string; pill: string; dot: string; count: string }> = {
  placed: { label: 'New', pill: 'bg-accent-soft text-accent', dot: 'bg-accent', count: 'text-accent' },
  packed: { label: 'Packed', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', count: 'text-amber-600' },
  out_for_delivery: {
    label: 'Out for delivery',
    pill: 'bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
    count: 'text-violet-600',
  },
  delivered: { label: 'Delivered', pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', count: 'text-emerald-600' },
  cancelled: { label: 'Cancelled', pill: 'bg-red-50 text-red-700', dot: 'bg-red-500', count: 'text-red-600' },
};

export type StatusFilter = OrderStatus | 'all';

export function customerName(order: PartnerOrder): string {
  return order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
}

// provider_payment_id is set when Razorpay captures payment. The product is
// online-payment-only, so null means "capture hasn't landed yet", never COD.
export function paymentInfo(order: Pick<PartnerOrder, 'provider_payment_id'>): { label: string; className: string } {
  return order.provider_payment_id
    ? { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' }
    : { label: 'Awaiting payment', className: 'bg-amber-50 text-amber-700' };
}

// What the owner keeps: item total minus Gloceries' commission. The delivery
// fee pays the rider, so it is not part of the store's earning.
export function storeEarning(order: PartnerOrder): number {
  return order.item_total - order.commission_amount;
}

// "Today, 10:42 am" / "Yesterday, 6:05 pm" / "13 Oct, 9:12 am" — the day is
// what an owner scans for, the year almost never matters.
export function orderWhen(iso: string, now: number): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const today = new Date(now);
  const yesterday = new Date(now - 86400e3);
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  const day = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
  return `${day}, ${time}`;
}

// How long a New order has been waiting for the owner, with an urgency tone:
// calm under 5 min, amber past 5, red past 10 (the customer is watching).
export function waitInfo(placedAt: string, now: number): { label: string; className: string } {
  const mins = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60000));
  const label = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
  const className =
    mins > 10 ? 'bg-red-50 text-red-700' : mins > 5 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
  return { label: `Waiting ${label}`, className };
}

// A clock that ticks every 30s so "Waiting N min" stays honest between the
// 12s data polls without re-rendering the page every second.
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// Keep Tab / Shift+Tab cycling inside a modal surface (details panel, reject
// dialog) so keyboard focus can't wander to the page hidden behind it.
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const focusables = [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
