'use client';

// One customer's account — profile, real saved addresses, real order
// history. Reached from Customers' own search list. Client component
// (not a server-fetched page like stores/[id]) since this data is
// service-role only, same "no anon-key read policy" reason every other
// service-role admin page is a client component calling its own API route.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import type { OrderStatus } from '@/lib/types';

interface CustomerDetail {
  id: string;
  name: string | null;
  phone: string;
  createdAt: string;
  addresses: { id: string; label: string | null; line1: string; landmark: string | null; isDefault: boolean }[];
  orders: { id: string; status: OrderStatus; total: number; placedAt: string; storeName: string }[];
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load this customer.');
        setCustomer(await res.json());
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load this customer.'));
  }, [id]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/customers" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} />
        Back to Customers
      </Link>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      {!customer && !loadError && <p className="text-sm text-muted">Loading…</p>}

      {customer && (
        <>
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-ink-soft">
                {(customer.name ?? customer.phone).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{customer.name ?? 'No name on file'}</p>
                <p className="text-sm text-muted">{customer.phone}</p>
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
              Joined {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-ink">Saved addresses</h3>
            <div className="flex flex-col gap-3">
              {customer.addresses.map((address) => (
                <div key={address.id} className="flex items-start gap-3 rounded-2xl bg-accent/40 p-3.5">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-ink-soft" />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {address.label ?? 'Address'}
                      {address.isDefault && <span className="ml-2 text-xs font-semibold text-success">Default</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {address.line1}
                      {address.landmark ? `, ${address.landmark}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {customer.addresses.length === 0 && <p className="text-sm text-muted">No saved addresses.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-ink">Order history</h3>
            <div className="flex flex-col gap-3">
              {customer.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{order.storeName}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(order.total)}</span>
                    <StatusPill status={order.status} />
                  </div>
                </div>
              ))}
              {customer.orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
