'use client';

import Link from 'next/link';
import { ArrowUpRight, BellRing, Check, Eye, Loader2, X } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { itemCount, itemSummary, minutesSince } from './dashboardData';
import { useNow } from './parts';

export function FloatingOrderAttention({ orders, acceptingId, onAccept, onReject, error, onRetry, soundBlocked }: {
  soundBlocked?: boolean; orders: PartnerOrder[]; acceptingId: string | null;
  onAccept?: (order: PartnerOrder) => void; onReject?: (order: PartnerOrder) => void; error: boolean; onRetry: () => void;
}) {
  const now = useNow(15_000);
  if (!orders.length) return null;
  const sorted = [...orders].sort((a, b) => Date.parse(a.placed_at) - Date.parse(b.placed_at));

  return <aside aria-label="New orders awaiting acceptance" className="fixed bottom-3 right-3 z-40 flex h-[360px] max-h-[calc(100dvh-100px)] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-black/20 bg-[#F1F2F4] sm:bottom-4 sm:right-4">
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white px-4 py-3.5">
      <BellRing size={18} className="shrink-0 text-black" aria-hidden />
      <h2 className="flex-1 text-[14px] font-semibold text-ink">New orders</h2>
      <span aria-label={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'} waiting`} className="tnum flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">{orders.length}</span>
      <Link href="/orders" aria-label="View all waiting orders" className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 focus-visible:outline-2 focus-visible:outline-accent"><ArrowUpRight size={16} aria-hidden /></Link>
    </div>
    {soundBlocked && <p className="shrink-0 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">Click anywhere to enable order sound. Check your device volume.</p>}
    {error && <button type="button" onClick={onRetry} className="shrink-0 bg-amber-50 px-4 py-2 text-left text-[12px] font-medium text-amber-800">Couldn’t refresh orders. Tap to retry.</button>}
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[#F1F2F4] p-3">
      {sorted.map(order => <li key={order.id} className="rounded-xl border border-slate-200/70 bg-white p-3">
        <div className="flex items-start justify-between gap-2"><p className="truncate text-[13px] font-semibold text-ink">#{order.order_number}</p><span className="shrink-0 text-[11px] font-medium text-slate-500">{minutesSince(order.placed_at, now) < 1 ? 'Just now' : `${minutesSince(order.placed_at, now)} min waiting`}</span></div>
        <p title={itemSummary(order)} className="mt-1 truncate text-[12px] text-slate-500">{itemCount(order)} items · {itemSummary(order)}</p>
        <p className="tnum mt-2 text-[16px] font-semibold text-ink">{formatInr(order.total)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" disabled={!onAccept || acceptingId !== null} onClick={() => onAccept?.(order)} aria-label={`Accept order ${order.order_number}`} title={onAccept ? undefined : 'Demo order'} className="flex h-8 items-center justify-center gap-1 rounded-xl bg-green-600 px-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            {acceptingId === order.id ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />}{acceptingId === order.id ? 'Saving…' : 'Accept'}
          </button>
          <button type="button" disabled={!onReject || acceptingId !== null} onClick={() => onReject?.(order)} aria-label={`Reject order ${order.order_number}`} title={onReject ? undefined : 'Demo order'} className="flex h-8 items-center justify-center gap-1 rounded-xl bg-red-600 px-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"><X size={14} aria-hidden />Reject</button>
          <Link href={`/orders?order=${encodeURIComponent(order.id)}`} aria-label={`View order ${order.order_number}`} className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-black/30 bg-white px-2 text-[12px] font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"><Eye size={14} strokeWidth={1.5} aria-hidden />View</Link>
        </div>
      </li>)}
    </ul>
    <div className="shrink-0 bg-[#F1F2F4] px-3 pb-3 pt-1">
      <Link href="/orders" className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200/70 bg-white px-4 text-[12px] font-medium text-black transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">View all orders</Link>
    </div>
  </aside>;
}
