'use client';

// Small pieces shared by the order card, the list rows and the details panel,
// so a status pill or an Accept button is pixel-identical wherever it shows.

import clsx from 'clsx';
import { Check, Loader2, PackageCheck, X } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { AVATAR_PALETTE } from '@/lib/avatar';
import { STATUS_META, paymentInfo } from './orderMeta';

export function StatusPill({ status, className }: { status: PartnerOrder['status']; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={clsx(
        'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        meta.pill,
        className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PaymentBadge({ order }: { order: Pick<PartnerOrder, 'provider_payment_id' | 'payment_method'> }) {
  const pay = paymentInfo(order);
  return (
    <span className={clsx('inline-flex w-fit whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', pay.className)}>
      {pay.label}
    </span>
  );
}

// Product photo, or the product's first letter on a soft tint when the
// catalogue has no photo — never a fabricated image.
export function ItemThumb({
  name,
  imageUrl,
  index,
  className,
}: {
  name: string;
  imageUrl: string | null | undefined;
  index: number;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className={clsx('shrink-0 rounded-xl bg-slate-50 object-cover', className)} />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-xl text-xs font-semibold',
        AVATAR_PALETTE[index % AVATAR_PALETTE.length],
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  );
}

const MAX_THUMBS = 3;

// Overlapping stack of up to three item thumbs, a "+N" tile for the rest, and
// the real line count — enough to judge an order's size at a glance.
export function ItemStack({ order }: { order: PartnerOrder }) {
  const items = order.order_items;
  const shown = items.slice(0, MAX_THUMBS);
  const overflow = items.length - shown.length;
  const units = items.reduce((sum, it) => sum + it.quantity, 0);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex shrink-0 -space-x-2">
        {shown.map((it, i) => (
          <ItemThumb
            key={it.id ?? i}
            index={i}
            name={it.products?.name ?? 'Item'}
            imageUrl={it.products?.image_url}
            className="h-8 w-8 ring-2 ring-white"
          />
        ))}
        {overflow > 0 && (
          <span className="tnum flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-semibold text-slate-600 ring-2 ring-white">
            +{overflow}
          </span>
        )}
      </div>
      <span className="truncate text-sm text-slate-500">
        <span className="tnum">{items.length}</span> {items.length === 1 ? 'item' : 'items'}
        {units !== items.length && (
          <>
            {' · '}
            <span className="tnum">{units}</span> units
          </>
        )}
      </span>
    </div>
  );
}

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_SIZE = { sm: 'h-8 px-3.5 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-sm' } as const;

// The only owner-side moves the backend allows: Accept (placed → packed) and
// Reject (→ cancelled, with a reason). Every later step is rider/system-
// driven, so non-placed orders get no action here. Demo mode passes
// `accepted` + onMarkPacked for its two-step preview (Accept stages, Mark
// packed flips) — a step the real state machine doesn't have. Handlers
// absent → buttons render disabled and never fire.
export function OrderActions({
  order,
  onAccept,
  onReject,
  onMarkPacked,
  accepted = false,
  busy,
  anyBusy,
  size = 'sm',
  stretch = false,
}: {
  order: PartnerOrder;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkPacked?: (id: string) => void;
  accepted?: boolean;
  busy: boolean;
  anyBusy: boolean;
  size?: keyof typeof BTN_SIZE;
  stretch?: boolean;
}) {
  if (order.status !== 'placed') return null;
  const iconSize = size === 'sm' ? 14 : 16;

  if (accepted) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMarkPacked?.(order.id);
        }}
        disabled={anyBusy || !onMarkPacked}
        className={clsx(BTN_BASE, BTN_SIZE[size], 'bg-accent text-white hover:bg-accent-strong', stretch && 'flex-1')}
      >
        <PackageCheck size={iconSize} />
        Mark packed
      </button>
    );
  }

  return (
    <div className={clsx('flex items-center gap-2', stretch && 'w-full')}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReject?.(order.id);
        }}
        disabled={!onReject || anyBusy}
        title={onReject ? undefined : 'No real order to reject yet'}
        aria-label={`Reject order ${order.order_number}`}
        className={clsx(
          BTN_BASE,
          BTN_SIZE[size],
          'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700',
          stretch && 'flex-1',
        )}
      >
        <X size={iconSize} />
        Reject
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAccept?.(order.id);
        }}
        disabled={!onAccept || anyBusy}
        title={onAccept ? undefined : 'No real order to accept yet'}
        aria-label={`Accept order ${order.order_number}`}
        className={clsx(
          BTN_BASE,
          BTN_SIZE[size],
          'bg-accent text-white shadow-[0_1px_2px_rgba(21,93,252,0.25)] hover:bg-accent-strong',
          stretch && 'flex-[2]',
        )}
      >
        {busy ? <Loader2 size={iconSize} className="animate-spin" /> : <Check size={iconSize} />}
        Accept
      </button>
    </div>
  );
}
