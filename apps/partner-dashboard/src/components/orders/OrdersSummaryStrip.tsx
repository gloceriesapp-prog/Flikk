'use client';

import { Clock3, PackageCheck, ShoppingBag, Timer, XCircle, Bell, type LucideIcon } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { durationLabel, orderSummaryData } from './orderSummaryData';
import type { StatusFilter } from './orderMeta';

type Metric = { label: string; value: string; badge: string; detail: string; tone?: 'green' | 'red'; icon: LucideIcon; filter?: StatusFilter };
const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function OrdersSummaryStrip({ orders, active, onSelect, loading, now }: {
  orders: PartnerOrder[]; active: StatusFilter; onSelect: (filter: StatusFilter) => void; loading: boolean; now: number;
}) {
  const summary = orderSummaryData(orders, now);
  const demo = DEMO_DATA_ENABLED;
  const accept = demo ? 100_000 : summary.acceptMs;
  const pack = demo ? 420_000 : summary.packMs;
  const cancelRate = demo ? 2 / 14 * 100 : summary.cancelRate;
  const growth = demo ? 8 : summary.growth;
  const metrics: Metric[] = [
    { label: 'Today’s orders', value: demo ? '14' : String(summary.count), badge: growth === null ? 'Today · IST' : `${growth > 0 ? '+' : ''}${Math.round(growth)}% vs same time yesterday`, detail: demo ? '₹2,480 · avg ₹177' : `${money(summary.sales)} · avg ${summary.averageValue === null ? '—' : money(summary.averageValue)}`, icon: ShoppingBag },
    { label: 'Avg. time to accept', value: durationLabel(accept), badge: accept === null ? 'No accepted orders yet' : accept < 120_000 ? 'Under 2 min' : 'Target under 2 min', tone: accept === null ? undefined : accept < 120_000 ? 'green' : 'red', detail: demo ? 'Slowest: 6 min (#FLK-1043)' : summary.slowest ? `Slowest: ${durationLabel(summary.slowest.ms)} (#${summary.slowest.order.order_number})` : 'Measured after acceptance', icon: Clock3 },
    { label: 'Avg. time to pack', value: durationLabel(pack), badge: pack === null ? 'No packed orders yet' : pack < 600_000 ? 'Under 10 min' : 'Over 10 min', tone: pack === null ? undefined : pack < 600_000 ? 'green' : 'red', detail: 'Target under 10 min', icon: Timer },
    { label: 'Cancelled / rejected', value: demo ? '2' : String(summary.cancelled), badge: `${cancelRate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}% of today’s orders`, tone: cancelRate > 5 ? 'red' : undefined, detail: demo ? '1 out of stock · 1 customer cancelled' : summary.cancelReasons || 'No cancellations today', icon: XCircle },
    { label: 'Awaiting acceptance', value: demo ? '2' : String(summary.awaiting), badge: 'New orders', detail: 'Review and accept to prepare', icon: Bell, filter: 'placed' },
    { label: 'Ready for pickup', value: demo ? '1' : String(summary.ready), badge: 'Packed orders', detail: 'Waiting for rider pickup', icon: PackageCheck, filter: 'packed' },
  ];
  return <section aria-label="Order performance" className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
    {metrics.map(({ label, value, badge, tone, icon: Icon, filter }) => {
      const content = <>
        <div className="flex items-start justify-between gap-2"><h2 className="text-[13px] font-semibold leading-5 text-black">{label}</h2><Icon size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-slate-400" aria-hidden /></div>
        <p className="tnum mt-2 text-[28px] font-semibold leading-tight tracking-tight text-ink">{loading ? '—' : value}</p>
        <p className={`mt-2 text-[13px] font-medium leading-5 ${tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-600' : 'text-slate-500'}`}>{loading ? 'Loading…' : badge}</p>
      </>;
      const classes = 'flex min-w-0 flex-col rounded-2xl border bg-white px-4 pt-4 pb-3 text-left';
      return filter ? <button key={label} type="button" onClick={() => onSelect(active === filter ? 'all' : filter)} aria-pressed={active === filter} className={`${classes} ${active === filter ? 'border-black/40' : 'border-slate-200/70'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}>{content}</button> : <div key={label} className={`${classes} border-slate-200/70`}>{content}</div>;
    })}
  </section>;
}
