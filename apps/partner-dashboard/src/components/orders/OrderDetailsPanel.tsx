'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Clock, History, X } from 'lucide-react';
import { orderItemSettlement } from '@/lib/orderRevenue';
import type { PartnerOrder } from '@/lib/partnerApi';
import { customerName, orderWhen, trapTab, waitInfo } from './orderMeta';
import { ItemThumb, OrderActions, PaymentBadge, StatusPill } from './OrderBits';
import { OrderBagIcon, ReceiptBillIcon } from './OrderDetailIcons';
import { OrderTimeline } from './OrderTimeline';
import type { OrderRowHandlers } from './OrderCard';

const itemPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });

const settlementPrice = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;

const NEXT_HINT: Partial<Record<PartnerOrder['status'], string>> = {
  placed: 'Accept to start packing. The customer is waiting.',
  packed: 'Looking for a nearby rider to pick it up.',
  out_for_delivery: 'The rider is taking it to the customer.',
};

// Order details as a right-side slide-over (full-screen sheet on phones), so
// the list stays in view behind it. Everything the owner needs to pack and
// hand over: purchased items, minimal order info and the status history,
// and — only for a New order — Accept/Reject pinned in the footer.
// Esc and the backdrop close it; Tab is trapped inside; focus returns to the
// card/row that opened it.
export function OrderDetailsPanel({
  order,
  now,
  onClose,
  ...h
}: { order: PartnerOrder | null; now: number; onClose: () => void } & Omit<OrderRowHandlers, 'onOpen'>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus the dialog itself (announces its title) rather than the close
    // button, so the first Tab lands on Close without a stray focus ring.
    panelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Portalled to <body> so the dashboard's scrolling <main> neither clips it
  // nor scroll-chains behind it.
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-slate-900/35 transition-opacity duration-200 starting:opacity-0"
        onMouseDown={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-panel-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          trapTab(e, panelRef.current);
        }}
        className="absolute inset-0 flex flex-col overflow-hidden bg-[#F1F2F4] shadow-2xl outline-none transition duration-300 ease-out starting:translate-x-10 starting:opacity-0 sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[460px] sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 bg-white border-b border-slate-200/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Order details</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 id="order-panel-title" className="tnum text-xl font-semibold text-ink">
                {order ? `#${order.order_number}` : 'Order not found'}
              </h2>
              {order && <StatusPill status={order.status} />}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-black transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
          >
            <X size={20} />
          </button>
        </header>

        {order ? (
          <PanelBody order={order} now={now} accepted={Boolean(order.accepted_at || h.acceptedIds?.has(order.id))} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-ink">We couldn&apos;t find this order.</p>
            <p className="text-sm text-slate-500">It may belong to another store, or the link is wrong.</p>
          </div>
        )}

        <footer className="bg-white border-t border-slate-200/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {order?.status === 'placed' ? (
            <OrderActions
              order={order}
              onAccept={h.onAccept}
              onReject={h.onReject}
              onMarkPacked={h.onMarkPacked}
              accepted={h.acceptedIds?.has(order.id)}
              busy={h.actioningId === order.id}
              anyBusy={h.actioningId != null}
              size="lg"
              stretch
            />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Close
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function PanelBody({ order, now, accepted }: { order: PartnerOrder; now: number; accepted: boolean }) {
  const settlement = orderItemSettlement(order);
  const commissionLabel = settlement.commissionPercent === null ? 'Commission' : `Commission (${settlement.commissionPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%)`;
  const wait = order.status === 'placed' && !accepted ? waitInfo(order.store_visible_at || order.placed_at, now) : null;
  return (
    <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
      <Section icon={<OrderBagIcon className="h-5 w-5" />} title={`Items (${order.order_items.length})`}>
        <ul className="divide-y divide-slate-200/70">
          {order.order_items.map((item, index) => {
            const name = item.product_name_at_order ?? item.products?.name ?? 'Item';
            const pack = item.unit_at_order ?? item.products?.unit;
            return <li key={item.id ?? index} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <ItemThumb name={name} imageUrl={item.product_image_at_order ?? item.products?.image_url} index={index} neutral className="h-12 w-12 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-5 text-ink">{name}</p>
                <p className="tnum mt-1 text-[12px] font-medium text-slate-500">{pack ? `${pack} · ` : ''}×{item.quantity}</p>
              </div>
              <span className="tnum shrink-0 text-[14px] font-semibold text-ink">{itemPrice.format(item.quantity * item.unit_price_at_order)}</span>
            </li>;
          })}
        </ul>

      </Section>
      <Section icon={<ReceiptBillIcon className="h-5 w-5" />} title="Order info">
        <dl className="space-y-3 text-[14px]">
          <Row label="Placed"><span className="tnum">{orderWhen(order.placed_at, now)}</span></Row>
          <Row label="Waiting">{wait ? <span className="tnum inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-black"><Clock size={12} aria-hidden />{wait.label.replace('Waiting ', '')}</span> : '—'}</Row>
          <Row label="Customer">{customerName(order)}</Row>
          <Row label="Payment"><PaymentBadge order={order} /></Row>
        </dl>
      </Section>
      <Section icon={<ReceiptBillIcon className="h-5 w-5" />} title="Payment">
        <dl className="space-y-3 text-[13px]">
          <Row label="Total pay (items)"><span className="tnum font-semibold">{settlementPrice(settlement.itemsTotal)}</span></Row>
          <Row label={commissionLabel}><span className="tnum text-slate-600">−{settlementPrice(settlement.commission)}</span></Row>
          <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
            <dt className="min-w-0 flex-1 text-[14px] font-bold text-ink">Total</dt>
            <dd className="tnum shrink-0 text-[19px] font-bold tracking-tight text-green-700">{settlementPrice(settlement.receivable)}</dd>
          </div>
        </dl>
      </Section>
      <Section icon={<History size={18} />} title="Status">
        <OrderTimeline cancelled={order.status === 'cancelled'} hint={accepted && order.status === 'placed' ? 'Prepare the items, then mark the order packed.' : NEXT_HINT[order.status]} steps={[
          { key: 'placed', label: 'Placed', at: order.placed_at },
          ...(!order.packed_at || order.accepted_at ? [{ key: 'accepted', label: 'Accepted', at: order.accepted_at ?? null, completed: accepted }] : []),
          { key: 'packed', label: 'Packed', at: order.packed_at },
          { key: 'picked_up', label: 'Picked up by rider', at: order.picked_up_at },
          { key: 'delivered', label: 'Delivered', at: order.delivered_at },
        ]} />
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/50 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-black" aria-hidden>
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink">{children}</dd>
    </div>
  );
}
