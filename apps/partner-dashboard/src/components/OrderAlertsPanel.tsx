'use client';

// Right-hand rail beside the sales chart: a compact, order-derived alert
// feed. Each row is a real order the owner might want to act on, newest
// first — the status drives both the message and the colour tone (placed =
// needs packing, cancelled = lost, etc.). Same PartnerOrder[] the page
// already fetched; nothing invented.

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';

const ALERT: Record<PartnerOrder['status'], { msg: string; tone: string; dot: string }> = {
  placed: { msg: 'Needs packing', tone: 'text-amber-600', dot: 'bg-amber-500' },
  packed: { msg: 'Ready for pickup', tone: 'text-indigo-600', dot: 'bg-indigo-500' },
  out_for_delivery: { msg: 'Out for delivery', tone: 'text-indigo-600', dot: 'bg-indigo-500' },
  delivered: { msg: 'Delivered', tone: 'text-emerald-600', dot: 'bg-emerald-500' },
  cancelled: { msg: 'Order cancelled', tone: 'text-red-600', dot: 'bg-red-500' },
};

const STATUS_WORD: Record<PartnerOrder['status'], string> = {
  placed: 'new',
  packed: 'packed',
  out_for_delivery: 'on the way',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function OrderAlertsPanel({ orders }: { orders: PartnerOrder[] }) {
  const recent = [...orders]
    .sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-black">Recent alerts</p>
        <Link href="/orders" className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-black">
          View all <ArrowUpRight size={13} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">No orders yet.</p>
      ) : (
        <div className="mt-2 flex flex-col">
          {recent.map((o) => {
            const a = ALERT[o.status];
            return (
              <div key={o.id} className="flex items-start justify-between gap-3 border-b border-neutral-100 py-3 last:border-0">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-neutral-900">{o.order_number}</p>
                    <p className="text-[12px] text-neutral-400">{a.msg}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[13px] font-semibold ${a.tone}`}>{STATUS_WORD[o.status]}</p>
                  <p className="text-[12px] text-neutral-400">{timeAgo(o.placed_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
