'use client';

// Right-hand rail beside the sales chart: a bordered two-column table —
// "Recent Alerts" (order + message) | "Status". Each row is a real order,
// newest first; status drives the message + tone. A 'placed' order is the
// only one the store owner can action, so its Status cell carries a green
// "Accept order" button (placed → packed, the sole partner-side transition
// the backend allows — routes/orders.ts rejects anything else). Every other
// status is read-only here: the rider/system moves an order packed →
// out_for_delivery → delivered, not the store owner. Same PartnerOrder[] the
// page fetched; nothing invented. The outer rounded border is the wrapping
// Card — this draws only the header rule, column divider, and row rules.

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';

const COLS = 'minmax(0,1.7fr) minmax(120px,1fr)';

// Each row is a title + one-line subheading (never wraps): the title names the
// event, the sub carries the order ref plus the one detail that matters for
// that status — the credited amount on delivery, "refunded" on a cancel. Right
// column is the Status cell: the coloured state word + time, and a single
// action — the green Accept button on a 'placed' order (the sole owner-side
// transition the backend allows), a plain "View" link on every other status.
function alertTitle(o: PartnerOrder): string {
  switch (o.status) {
    case 'placed': return 'New order';
    case 'packed': return 'Packed';
    case 'out_for_delivery': return 'Out for delivery';
    case 'delivered': return 'Payment credited';
    case 'cancelled': return 'Order cancelled';
  }
}

function alertSub(o: PartnerOrder): string {
  switch (o.status) {
    case 'placed': return `${o.order_number} · tap accept`;
    case 'packed': return `${o.order_number} · awaiting pickup`;
    case 'out_for_delivery': return `${o.order_number} · en route`;
    case 'delivered': return `${o.order_number} · ${formatInr(o.total)}`;
    case 'cancelled': return `${o.order_number} · refunded`;
  }
}

const TONE: Record<PartnerOrder['status'], string> = {
  placed: 'text-amber-600',
  packed: 'text-indigo-600',
  out_for_delivery: 'text-indigo-600',
  delivered: 'text-emerald-600',
  cancelled: 'text-red-600',
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

interface Props {
  orders: PartnerOrder[];
  // Advances a 'placed' order to 'packed'. Absent (e.g. demo data) → the
  // Accept button renders disabled, since there's no real order behind it.
  onAccept?: (id: string) => void;
  acceptingId?: string | null;
}

export function OrderAlertsPanel({ orders, onAccept, acceptingId }: Props) {
  const recent = [...orders]
    .sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col text-[13px]">
      {/* Header row */}
      <div className="grid" style={{ gridTemplateColumns: COLS }}>
        <div className="flex items-center border-b border-r border-hairline px-4 py-3">
          <span className="text-sm font-semibold text-black">Recent Alerts</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <span className="text-sm font-semibold text-black">Status</span>
          <Link href="/orders" className="flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-400 hover:text-black">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="px-4 py-6 text-sm text-neutral-400">No orders yet.</p>
      ) : (
        recent.map((o) => {
          const isPlaced = o.status === 'placed';
          const accepting = acceptingId === o.id;
          return (
            <div key={o.id} className="grid border-b border-hairline last:border-b-0" style={{ gridTemplateColumns: COLS }}>
              {/* Recent Alerts cell — title + one-line sub; links to the order */}
              <Link
                href={`/orders/${o.id}`}
                className="flex min-w-0 flex-col justify-center gap-0.5 border-r border-hairline px-4 py-3.5 transition-colors hover:bg-neutral-50"
              >
                <p className="truncate font-medium tracking-tight text-neutral-900">{alertTitle(o)}</p>
                <p className="truncate text-[12px] font-medium tracking-tight text-neutral-400">{alertSub(o)}</p>
              </Link>

              {/* Status cell — coloured state word + time, then one action:
                  Accept on 'placed' (owner-side placed→packed), else View. */}
              <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                <div className="min-w-0">
                  <p className={`truncate font-medium tracking-tight ${TONE[o.status]}`}>{STATUS_WORD[o.status]}</p>
                  <p className="text-[12px] font-medium tracking-tight text-neutral-400">{timeAgo(o.placed_at)}</p>
                </div>
                {isPlaced ? (
                  <button
                    type="button"
                    onClick={() => onAccept?.(o.id)}
                    disabled={!onAccept || accepting}
                    title={onAccept ? undefined : 'No real order to accept yet'}
                    className="shrink-0 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {accepting ? 'Accepting…' : 'Accept'}
                  </button>
                ) : (
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex shrink-0 items-center gap-0.5 text-xs font-medium tracking-tight text-neutral-400 hover:text-black"
                  >
                    View <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
