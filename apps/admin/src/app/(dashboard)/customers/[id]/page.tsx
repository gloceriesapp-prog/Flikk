'use client';

// One customer's account — profile, real saved addresses, real order
// history. Reached from Customers' own search list. Client component
// (not a server-fetched page like stores/[id]) since this data is
// service-role only, same "no anon-key read policy" reason every other
// service-role admin page is a client component calling its own API route.

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { ReasonModal } from '@/components/ui/ReasonModal';
import { BLOCK_DURATIONS } from '@/lib/customerBlocks';
import type { OrderStatus } from '@/lib/types';

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  createdAt: string;
  block: { reason: string; blockedAt: string | null; blockedUntil: string | null } | null;
  blockHistory: { reason: string; blockedAt: string; blockedUntil: string | null; unblockedAt: string | null }[];
  addresses: { id: string; label: string | null; line1: string; landmark: string | null; isDefault: boolean }[];
  orders: { id: string; status: OrderStatus; total: number; placedAt: string; storeName: string }[];
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ name: string; email: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/customers/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load this customer.');
        setCustomer(await res.json());
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load this customer.'));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function block(reason: string, duration: string | null) {
    const res = await fetch(`/api/customers/${id}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, duration }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not block this customer.');
    setBlocking(false);
    await load();
  }

  // Name and contact email only; the phone number is the sign-in identity.
  async function saveProfile() {
    if (!editing) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name, email: editing.email.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save this customer.');
      setEditing(null);
      await load();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save this customer.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function unblock() {
    if (!window.confirm('Unblock this customer? They can sign in and order again.')) return;
    setActionError(null);
    const res = await fetch(`/api/customers/${id}/block`, { method: 'DELETE' });
    if (!res.ok) {
      setActionError((await res.json().catch(() => null))?.error ?? 'Could not unblock this customer.');
      return;
    }
    await load();
  }

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
              <div className="flex-1">
                <p className="text-lg font-semibold text-ink">{customer.name ?? 'No name on file'}</p>
                <p className="text-sm text-muted">{customer.phone}</p>
                {customer.email && <p className="text-sm text-muted">{customer.email}</p>}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileError(null);
                    setEditing({ name: customer.name ?? '', email: customer.email ?? '' });
                  }}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-accent"
                >
                  Edit profile
                </button>
              )}
            </div>
            {editing && (
              <form
                className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
                  Name
                  <input
                    value={editing.name}
                    maxLength={80}
                    required
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-normal text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
                  Email (optional)
                  <input
                    type="email"
                    value={editing.email}
                    maxLength={254}
                    onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-normal text-ink"
                  />
                </label>
                <p className="text-xs text-muted">The phone number is how the customer signs in, so it cannot be changed here. Every change is recorded with your email.</p>
                {profileError && <p className="text-sm text-danger">{profileError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={savingProfile} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {savingProfile ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-accent">
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
              Joined {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              {customer.block ? (
                <div>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger">Blocked</span>
                  <p className="mt-2 text-sm text-ink">{customer.block.reason}</p>
                  <p className="text-xs text-muted">
                    {customer.block.blockedUntil ? `Until ${formatDateTime(customer.block.blockedUntil)}` : 'Until unblocked'}
                  </p>
                </div>
              ) : (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">Active</span>
              )}
              {customer.block ? (
                <button type="button" onClick={() => void unblock()} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-accent">
                  Unblock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setBlocking(true);
                  }}
                  className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white"
                >
                  Block customer
                </button>
              )}
            </div>
            {actionError && <p className="mt-2 text-sm text-danger">{actionError}</p>}
            {customer.blockHistory.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-ink">Block history</p>
                <ul className="flex flex-col gap-1.5">
                  {customer.blockHistory.map((b) => (
                    <li key={b.blockedAt} className="text-xs text-muted">
                      {formatDateTime(b.blockedAt)} · {b.reason}
                      {b.unblockedAt ? ` · lifted ${formatDateTime(b.unblockedAt)}` : b.blockedUntil ? ` · until ${formatDateTime(b.blockedUntil)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

      {blocking && (
        <ReasonModal
          title="Block customer"
          description="The customer is signed out of the app on their next request and cannot sign in or order until the block ends or you unblock them."
          confirmLabel="Block"
          durations={BLOCK_DURATIONS.map((d) => ({ value: d.value, label: d.label }))}
          onClose={() => setBlocking(false)}
          onConfirm={block}
        />
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
