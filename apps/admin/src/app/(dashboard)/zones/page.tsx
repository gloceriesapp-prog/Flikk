'use client';

// Zones — matches the zones table being first-class in the schema from
// day 1 (PRD Section 16). Only Kaup is active; the other cards show the
// framework is ready for Section 26's roadmap (Karkala/Kundapura) without
// any schema change — CLAUDE.md is explicit multi-zone itself is NOT in
// scope yet, so these render as disabled "coming later" cards, not
// activatable toggles. Two tabs: "Zones" (what's live, and which store in
// it is winning) and "Zone Requests" (customer-app demand signal for
// where Flikk isn't yet — informational only, never an activation
// control).
//
// Real data now: app/api/zones (service role) for the zone roster + store/
// rider counts, lib/supabase/stores.ts + app/api/orders (both already
// real, shared with Stores/Orders pages) for the store-performance
// breakdown. Zone Requests stays a labeled placeholder — no real
// collection pipeline exists (would mean a new customer-app feature, out
// of this fix's scope), so an honest "not collected yet" beats a
// fabricated number here.

import { useCallback, useEffect, useState } from 'react';
import { Lock, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { StorePerformanceList } from '@/components/zones/StorePerformanceList';
import { ZoneRequestsList } from '@/components/zones/ZoneRequestsList';
import { PLACEHOLDER_ZONE_REQUESTS } from '@/lib/mock-data';
import { storeRevenueShares } from '@/lib/revenue';
import { fetchStores } from '@/lib/supabase/stores';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Order, Store, Zone } from '@/lib/types';

const TABS = ['Zones', 'Zone Requests'] as const;

export default function ZonesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Zones');
  const [zones, setZones] = useState<Zone[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [zonesRes, ordersRes, storesData] = await Promise.all([fetch('/api/zones'), fetch('/api/orders'), fetchStores()]);
      if (!zonesRes.ok) throw new Error((await zonesRes.json()).error ?? 'Could not load zones.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      setZones(await zonesRes.json());
      setOrders(await ordersRes.json());
      setStores(storesData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load zones.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useAdminRealtime(loadData);

  const activeZone = zones.find((z) => z.isActive);
  const shares = activeZone ? storeRevenueShares(activeZone.name, stores, orders) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Zones</h1>
        <p className="text-sm text-muted">Flikk launches single-zone — this is where a second zone activates later.</p>
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
                {PLACEHOLDER_ZONE_REQUESTS.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Zones' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={
                  zone.isActive
                    ? 'rounded-3xl border border-border bg-card p-5'
                    : 'rounded-3xl border border-dashed border-border bg-card/50 p-5 opacity-70'
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                    <MapPin size={18} className="text-ink-soft" />
                  </div>
                  {zone.isActive ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">Active</span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-muted">
                      <Lock size={11} />
                      Not yet
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink">{zone.name}</h3>
                {zone.isActive ? (
                  <p className="mt-1 text-sm text-muted">
                    {zone.storeCount} stores · {zone.riderCount} riders
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Planned per roadmap — activates with zero schema change.</p>
                )}
              </div>
            ))}
            {zones.length === 0 && !loadError && <p className="py-8 text-center text-sm text-muted">Loading zones…</p>}
          </div>

          {activeZone && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-ink">Store performance — {activeZone.name}</h3>
                <p className="text-xs text-muted">Each store&apos;s share of the zone&apos;s delivered revenue — adds up to 100%.</p>
              </div>
              <StorePerformanceList shares={shares} />
            </div>
          )}
        </div>
      )}

      {tab === 'Zone Requests' && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-ink">Where customers are asking for Flikk</h3>
            <p className="text-xs text-muted">
              Upvoted from the customer app — a demand signal, not an activation control.
            </p>
          </div>
          <ZoneRequestsList requests={PLACEHOLDER_ZONE_REQUESTS} />
        </div>
      )}
    </div>
  );
}
