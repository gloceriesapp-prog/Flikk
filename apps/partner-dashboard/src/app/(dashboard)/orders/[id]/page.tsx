'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, X } from 'lucide-react';
import {
  fetchMyOrders,
  updateOrderStatus,
  type PartnerOrder,
} from '@/lib/partnerApi';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { formatInr, formatDateTime, statusColor, statusLabel } from '@/lib/format';
import { paymentStatus } from '@/lib/orderPayment';
import { avatarColorFor, initialsFor } from '@/lib/avatar';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { Card } from '@/components/ui/Card';

// No single-order endpoint exists on /partner — fetchMyOrders() is the same
// list the Orders table already uses, so the detail page re-fetches that
// list and looks its own row up by id rather than adding a new backend
// route for one lookup.
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<PartnerOrder[] | null>(null);
  // Local-only override for demo rows: Accept/Cancel on a demo order must
  // never hit the real /orders/:id/status endpoint (that id doesn't exist
  // server-side), so its status change is applied here instead.
  const [demoOrders, setDemoOrders] = useState(DEMO_ORDERS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders().then(setOrders);
  }, []);

  if (orders === null) {
    return <p className="py-20 text-center text-sm text-neutral-400">Loading order…</p>;
  }

  const isDemo = orders.length === 0;
  // Same isDemo convention as the Orders list page: a demo row's id (e.g.
  // "demo-order-1") only ever exists in DEMO_ORDERS, so falling back to it
  // here keeps a demo row's detail link working instead of 404-ing.
  const order = orders.find((o) => o.id === params.id) ?? (isDemo ? demoOrders.find((o) => o.id === params.id) : undefined);

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-sm font-medium text-neutral-700">Order not found.</p>
        <button type="button" onClick={() => router.push('/orders')} className="text-sm font-medium text-emerald-600">
          Back to orders
        </button>
      </div>
    );
  }

  const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
  const payment = paymentStatus(order);
  const canAccept = order.status === 'placed';
  const canCancel = order.status === 'placed' || order.status === 'packed';

  async function act(next: 'packed' | 'cancelled') {
    setActionError(null);
    if (isDemo) {
      const now = new Date().toISOString();
      setDemoOrders((prev) =>
        prev.map((o) => (o.id === order!.id ? { ...o, status: next, packed_at: next === 'packed' ? now : o.packed_at } : o)),
      );
      return;
    }
    setIsUpdating(true);
    try {
      await updateOrderStatus(order!.id, next);
      setOrders((prev) => prev!.map((o) => (o.id === order!.id ? { ...o, status: next } : o)));
    } catch {
      setActionError('Could not update this order. Try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft size={16} /> Back to orders
        </button>

        {(canAccept || canCancel) && (
          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => act('cancelled')}
                className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X size={15} /> Cancel order
              </button>
            )}
            {canAccept && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => act('packed')}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Accept & pack order
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{actionError}</div>}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Order</p>
          <p className="mt-0.5 font-mono text-sm text-neutral-700">#{order.id.slice(0, 8)}</p>
          <p className="mt-1 text-xs text-neutral-400">Placed {formatDateTime(order.placed_at)}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${statusColor(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-5">
            <p className="text-base font-semibold text-black">Items</p>
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  {item.products?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.products.image_url} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-hairline object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-400">
                      {item.quantity}×
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{item.products?.name ?? 'Item'}</p>
                    <p className="text-xs text-neutral-400">
                      {item.quantity} × {formatInr(item.unit_price_at_order)} {item.products?.unit}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">{formatInr(item.unit_price_at_order * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-col gap-2 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Item total</span>
                <span>{formatInr(order.item_total)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Delivery fee</span>
                <span>{formatInr(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Platform commission</span>
                <span>-{formatInr(order.commission_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold text-neutral-900">
                <span>Total</span>
                <span>{formatInr(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-base font-semibold text-black">Delivery address</p>
            <div className="mt-3 flex items-start gap-2.5 text-sm text-neutral-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-neutral-400" />
              <div>
                <p className="text-neutral-900">{order.addresses?.line1}</p>
                {order.addresses?.landmark && <p className="text-neutral-400">Near {order.addresses.landmark}</p>}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <p className="text-base font-semibold text-black">Customer</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(customerName)}`}>
                {initialsFor(customerName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{customerName}</p>
                {order.users?.phone && (
                  <p className="flex items-center gap-1 text-xs text-neutral-400">
                    <Phone size={11} /> {order.users.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4 text-sm">
              <span className="text-neutral-500">Payment</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${payment.className}`}>{payment.label}</span>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-4 text-base font-semibold text-black">Order timeline</p>
            <OrderTimeline
              cancelled={order.status === 'cancelled'}
              steps={[
                { key: 'placed', label: 'Placed', at: order.placed_at },
                { key: 'packed', label: 'Packed', at: order.packed_at },
                { key: 'out_for_delivery', label: 'Out for delivery', at: order.picked_up_at },
                { key: 'delivered', label: 'Delivered', at: order.delivered_at },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
