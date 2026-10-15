'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Clock, History, MapPin, Phone, ReceiptText, ShoppingBasket, X } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { customerName, orderWhen, storeEarning, trapTab, waitInfo } from './orderMeta';
import { ItemThumb, OrderActions, PaymentBadge, StatusPill } from './OrderBits';
import { OrderTimeline } from './OrderTimeline';
import type { OrderRowHandlers } from './OrderCard';

const NEXT_HINT: Partial<Record<PartnerOrder['status'], string>> = {
  placed: 'Accept to start packing. The customer is waiting.',
  packed: 'Looking for a nearby rider to pick it up.',
  out_for_delivery: 'The rider is taking it to the customer.',
};

// Order details as a right-side slide-over (full-screen sheet on phones), so
// the list stays in view behind it. Everything the owner needs to pack and
// hand over: who/where, every line, the money split, the status history,
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
        className="absolute inset-0 flex flex-col bg-white shadow-2xl outline-none transition duration-300 ease-out starting:translate-x-10 starting:opacity-0 sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[460px] sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
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
            className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={20} />
          </button>
        </header>

        {order ? (
          <PanelBody order={order} now={now} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-ink">We couldn&apos;t find this order.</p>
            <p className="text-sm text-slate-500">It may belong to another store, or the link is wrong.</p>
          </div>
        )}

        <footer className="border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
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

function PanelBody({ order, now }: { order: PartnerOrder; now: number }) {
  const name = customerName(order);
  const phone = order.users?.phone ?? null;
  const address = order.addresses;
  const wait = order.status === 'placed' ? waitInfo(order.placed_at, now) : null;
  const lineCount = order.order_items.length;

  return (
    <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
      <Section icon={<ReceiptText size={16} />} title="Order info">
        <dl className="space-y-2.5 text-sm">
          <Row label="Placed">
            <span className="tnum">{orderWhen(order.placed_at, now)}</span>
          </Row>
          {wait && (
            <Row label="Waiting">
              <span className={clsx('tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', wait.className)}>
                <Clock size={12} aria-hidden />
                {wait.label.replace('Waiting ', '')}
              </span>
            </Row>
          )}
          <Row label="Customer">{name}</Row>
          <Row label="Phone">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="tnum inline-flex items-center gap-1.5 rounded font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Phone size={13} aria-hidden />
                {phone}
              </a>
            ) : (
              <span className="text-slate-400">Not shared</span>
            )}
          </Row>
          <Row label="Payment">
            <PaymentBadge order={order} />
          </Row>
        </dl>
        {address && (
          <div className="mt-3 flex gap-2.5 rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">{address.recipient_name}</p>
              <p className="text-slate-600">{address.line1}</p>
              {address.landmark && <p className="text-slate-500">Landmark: {address.landmark}</p>}
            </div>
          </div>
        )}
      </Section>

      <Section
        icon={<ShoppingBasket size={16} />}
        title={
          <>
            Items <span className="tnum font-normal text-slate-500">({lineCount})</span>
          </>
        }
      >
        <ul className="divide-y divide-slate-200/70">
          {order.order_items.map((item, i) => {
            const pname = item.products?.name ?? 'Item';
            return (
              <li key={item.id ?? i} className="flex items-center gap-3 py-2.5 first:pt-0">
                <ItemThumb name={pname} imageUrl={item.products?.image_url} index={i} className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{pname}</p>
                  <p className="tnum text-xs text-slate-500">
                    {item.products?.unit ? `${item.products.unit} · ` : ''}
                    {item.quantity} × {formatInr(item.unit_price_at_order)}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm font-semibold text-ink">
                  {formatInr(item.quantity * item.unit_price_at_order)}
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-3 space-y-2 border-t border-slate-200/70 pt-3 text-sm">
          <MoneyRow label="Item total" value={formatInr(order.item_total)} />
          <MoneyRow label="Delivery fee" value={formatInr(order.delivery_fee)} />
          <MoneyRow label="Gloceries commission" value={`− ${formatInr(order.commission_amount)}`} />
          <div className="flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2.5">
            <dt className="font-semibold text-accent">You earn</dt>
            <dd className="tnum text-lg font-semibold text-accent">{formatInr(storeEarning(order))}</dd>
          </div>
          <MoneyRow label="Customer paid" value={formatInr(order.total)} muted />
        </dl>
      </Section>

      <Section icon={<History size={16} />} title="Status">
        <OrderTimeline
          cancelled={order.status === 'cancelled'}
          hint={NEXT_HINT[order.status]}
          steps={[
            { key: 'placed', label: 'Placed', at: order.placed_at },
            { key: 'packed', label: 'Accepted & packed', at: order.packed_at },
            { key: 'picked_up', label: 'Picked up by rider', at: order.picked_up_at },
            { key: 'delivered', label: 'Delivered', at: order.delivered_at },
          ]}
        />
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-accent" aria-hidden>
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

function MoneyRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <dt className={muted ? 'text-slate-500' : 'text-slate-600'}>{label}</dt>
      <dd className={clsx('tnum', muted ? 'text-slate-500' : 'font-medium text-ink')}>{value}</dd>
    </div>
  );
}
