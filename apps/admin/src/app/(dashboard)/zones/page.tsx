'use client';

// Zones — create, rename, activate/deactivate (app/api/zones, app/api/zones/
// [id]) and see which stores sit in each zone. A store's zone is assigned at
// approval (zone picker when several zones are active), in Add Store, or
// moved later from the store's own page (StoreZonePanel). Two tabs: "Zones"
// (roster + per-zone store performance) and "Zone Requests" (customer-app
// demand signal for where Gloceries isn't yet — informational only).
//
// Data: app/api/zones (service role) for the roster + counts, app/api/stores
// + app/api/orders for the store-performance breakdown (stores carry their
// real zone name now), app/api/area-upvotes for Zone Requests.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';
import clsx from 'clsx';
import { StorePerformanceList } from '@/components/zones/StorePerformanceList';
import { ZoneRequestsList } from '@/components/zones/ZoneRequestsList';
import { storeRevenueShares } from '@/lib/revenue';
import { fetchStores } from '@/lib/supabase/stores';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Order, Store, Zone, ZoneRequest } from '@/lib/types';

const TABS = ['Zones', 'Zone Requests'] as const;
const FIELD = 'rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

async function send(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save the zone.');
}

export default function ZonesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Zones');
  const [zones, setZones] = useState<Zone[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zoneRequests, setZoneRequests] = useState<ZoneRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newActive, setNewActive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busyZone, setBusyZone] = useState<string | null>(null);
  const [performanceZoneId, setPerformanceZoneId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [zonesRes, ordersRes, storesData, requestsRes] = await Promise.all([
        fetch('/api/zones', { cache: 'no-store' }),
        fetch('/api/orders'),
        fetchStores(),
        fetch('/api/area-upvotes'),
      ]);
      if (!zonesRes.ok) throw new Error((await zonesRes.json()).error ?? 'Could not load zones.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      if (!requestsRes.ok) throw new Error((await requestsRes.json()).error ?? 'Could not load zone requests.');
      setZones(await zonesRes.json());
      setOrders(await ordersRes.json());
      setStores(storesData);
      setZoneRequests(await requestsRes.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load zones.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useAdminRealtime(loadData);

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    try {
      await send('/api/zones', 'POST', { name: newName, isActive: newActive });
      setNewName('');
      setNewActive(false);
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the zone.');
    } finally {
      setCreating(false);
    }
  }

  async function updateZone(zone: Zone, patch: { name?: string; isActive?: boolean }) {
    if (patch.isActive === false) {
      const count = stores.filter((s) => s.zoneId === zone.id).length;
      const ok = window.confirm(
        `Deactivate ${zone.name}? Its ${count} store${count === 1 ? '' : 's'} disappear for customers and the zone leaves the approval picker.`,
      );
      if (!ok) return;
    }
    setBusyZone(zone.id);
    setActionError(null);
    try {
      await send(`/api/zones/${zone.id}`, 'PATCH', patch);
      setEditing(null);
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the zone.');
    } finally {
      setBusyZone(null);
    }
  }

  const activeZones = zones.filter((z) => z.isActive);
  const performanceZone = zones.find((z) => z.id === performanceZoneId) ?? activeZones[0];
  const shares = performanceZone ? storeRevenueShares(performanceZone.name, stores, orders) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Zones</h1>
        <p className="text-sm text-muted">Create zones, switch them on, and see which stores each one holds.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t}
            {t === 'Zone Requests' && (
              <span
                className={clsx(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  tab === t ? 'bg-white/20 text-white' : 'bg-accent text-ink-soft',
                )}
              >
                {zoneRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Zones' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={createZone} className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card p-5">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-ink">
              New zone
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Karkala, Udupi" maxLength={80} className={FIELD} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink">
              <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
              Active now
            </label>
            <button
              type="submit"
              disabled={creating || newName.trim().length < 2}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus size={15} />
              {creating ? 'Adding…' : 'Add zone'}
            </button>
          </form>
          {actionError && <p className="text-sm text-danger">{actionError}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => {
              const zoneStores = stores.filter((s) => s.zoneId === zone.id);
              const isEditing = editing?.id === zone.id;
              return (
                <div
                  key={zone.id}
                  className={zone.isActive ? 'rounded-3xl border border-border bg-card p-5' : 'rounded-3xl border border-dashed border-border bg-card/60 p-5'}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                      <MapPin size={18} className="text-ink-soft" />
                    </div>
                    {zone.isActive ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">Active</span>
                    ) : (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-muted">Inactive</span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-3 flex gap-2">
                      <input value={editing.name} onChange={(e) => setEditing({ id: zone.id, name: e.target.value })} maxLength={80} className={clsx(FIELD, 'flex-1')} />
                      <button
                        type="button"
                        disabled={busyZone === zone.id}
                        onClick={() => void updateZone(zone, { name: editing.name })}
                        className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-ink-soft">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="mt-3 text-lg font-semibold text-ink">{zone.name}</h3>
                  )}
                  <p className="mt-1 text-sm text-muted">
                    {zone.storeCount} stores{zone.isActive ? ` · ${zone.riderCount} riders` : ''}
                  </p>
                  {zoneStores.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-0.5 text-sm">
                      {zoneStores.slice(0, 6).map((s) => (
                        <li key={s.id}>
                          <Link href={`/stores/${s.id}`} className="text-ink-soft hover:text-ink hover:underline">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                      {zoneStores.length > 6 && <li className="text-xs text-muted">+{zoneStores.length - 6} more</li>}
                    </ul>
                  )}
                  <div className="mt-4 flex gap-2">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setEditing({ id: zone.id, name: zone.name })}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyZone === zone.id}
                      onClick={() => void updateZone(zone, { isActive: !zone.isActive })}
                      className={clsx(
                        'rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40',
                        zone.isActive ? 'border border-danger/30 text-danger' : 'bg-ink text-white',
                      )}
                    >
                      {zone.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
            {zones.length === 0 && !loadError && <p className="py-8 text-center text-sm text-muted">Loading zones…</p>}
          </div>
          <p className="text-xs text-muted">Move a store between zones from its own page (Stores → store → Zone).</p>

          {performanceZone && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-ink">Store performance — {performanceZone.name}</h3>
                  <p className="text-xs text-muted">Each store&apos;s share of the zone&apos;s delivered revenue — adds up to 100%.</p>
                </div>
                {activeZones.length > 1 && (
                  <select
                    value={performanceZone.id}
                    onChange={(e) => setPerformanceZoneId(e.target.value)}
                    aria-label="Zone for store performance"
                    className={FIELD}
                  >
                    {activeZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <StorePerformanceList shares={shares} />
            </div>
          )}
        </div>
      )}

      {tab === 'Zone Requests' && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-ink">Where customers are asking for Gloceries</h3>
            <p className="text-xs text-muted">
              Upvoted from the customer app — a demand signal, not an activation control.
            </p>
          </div>
          <ZoneRequestsList requests={zoneRequests} />
        </div>
      )}
    </div>
  );
}
