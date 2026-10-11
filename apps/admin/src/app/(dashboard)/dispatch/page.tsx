'use client';

// Trips & dispatch — every live trip (or single order) with its rider, the
// current offer ring and how many rings were offered (app/api/dispatch-board,
// admin_dispatch_board, migration 113). "Out of offers" keeps only trips whose
// every ring was offered with nobody accepting: automatic dispatch has stopped
// for them, so they need the manual assign below (same AssignRiderRow /
// admin_assign_order_rider path as the Riders page). The dispatch settings card
// edits the rings, time per ring and per-rider trip limit the backend's
// dispatch worker and accept path read on every pass.

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import clsx from 'clsx';
import { AssignRiderRow } from '@/components/dispatch/AssignRiderRow';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { DISPATCH_LIMITS, type DispatchSettings } from '@/lib/dispatchSettings';
import type { MapOrder, MapRider } from '@/lib/dispatchMap';
import type { ActiveRider, DispatchBoardRow } from '@/lib/types';

// Leaflet touches `window` at import, so the map is client-only — never in the
// server bundle (ssr:false). Keeps the map code out of the initial RSC payload.
const DispatchMap = dynamic(() => import('@/components/dispatch/DispatchMap'), {
  ssr: false,
  loading: () => <div className="h-[516px] animate-pulse rounded-3xl border border-border bg-accent" />,
});

type Filter = 'all' | 'out';

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

function DispatchSettingsCard() {
  const [saved, setSaved] = useState<DispatchSettings | null>(null);
  const [rings, setRings] = useState('');
  const [stepSeconds, setStepSeconds] = useState('');
  const [maxTrips, setMaxTrips] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function apply(settings: DispatchSettings) {
    setSaved(settings);
    setRings(settings.radiusStepsKm.join(', '));
    setStepSeconds(String(settings.stepSeconds));
    setMaxTrips(settings.maxActiveTripsPerRider == null ? '' : String(settings.maxActiveTripsPerRider));
  }

  useEffect(() => {
    fetch('/api/dispatch-settings')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Could not load dispatch settings.');
        apply(body as DispatchSettings);
      })
      .catch((err: unknown) => setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not load dispatch settings.' }));
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/dispatch-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radiusStepsKm: rings.split(',').map((part) => part.trim()).filter(Boolean).map(Number),
          stepSeconds: Number(stepSeconds),
          maxActiveTripsPerRider: maxTrips.trim() === '' ? null : Number(maxTrips),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save dispatch settings.');
      apply(body as DispatchSettings);
      setMessage({ ok: true, text: 'Saved. The next dispatch pass uses these settings.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not save dispatch settings.' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-2xl border border-border bg-canvas px-3.5 py-2 text-sm text-ink focus:outline-none';
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">Dispatch settings</h3>
      <p className="mb-4 text-xs text-muted">
        A packed order is offered to online riders inside the first ring, then widened ring by ring. After the last ring it waits for manual assignment.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Offer rings (km, comma separated)
          <input value={rings} onChange={(e) => setRings(e.target.value)} placeholder="3, 5, 8" className={inputClass} />
          <span className="font-normal text-muted">
            Up to {DISPATCH_LIMITS.maxRings} rings, {DISPATCH_LIMITS.minRingKm}–{DISPATCH_LIMITS.maxRingKm} km each.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Time per ring (seconds)
          <input type="number" min={DISPATCH_LIMITS.minStepSeconds} max={DISPATCH_LIMITS.maxStepSeconds} value={stepSeconds} onChange={(e) => setStepSeconds(e.target.value)} className={inputClass} />
          <span className="font-normal text-muted">
            {DISPATCH_LIMITS.minStepSeconds}–{DISPATCH_LIMITS.maxStepSeconds} s. Riders see this as the offer countdown.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Max active trips per rider
          <input type="number" min={1} max={DISPATCH_LIMITS.maxTripsPerRider} value={maxTrips} onChange={(e) => setMaxTrips(e.target.value)} placeholder="No limit" className={inputClass} />
          <span className="font-normal text-muted">Empty = no limit. Applies to offers, rider accepts and manual assignment.</span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !saved}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? 'Saving…' : 'Save dispatch settings'}
        </button>
        {message && <p className={clsx('text-xs font-medium', message.ok ? 'text-success' : 'text-danger')}>{message.text}</p>}
      </div>
    </div>
  );
}

export default function DispatchPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DispatchBoardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [mapRiders, setMapRiders] = useState<MapRider[]>([]);
  const [mapOrders, setMapOrders] = useState<MapOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [boardRes, ridersRes, mapRes] = await Promise.all([
        fetch(`/api/dispatch-board?page=${page}${filter === 'out' ? '&outOfOffers=1' : ''}`),
        fetch('/api/riders'),
        fetch('/api/dispatch-map'),
      ]);
      const board = await boardRes.json();
      if (!boardRes.ok) throw new Error(board.error ?? 'Could not load trips.');
      const riderList = await ridersRes.json();
      if (!ridersRes.ok) throw new Error(riderList.error ?? 'Could not load riders.');
      const map = await mapRes.json();
      if (!mapRes.ok) throw new Error(map.error ?? 'Could not load the live map.');
      setRows(board.items);
      setTotal(board.total);
      setPageSize(board.pageSize);
      setRiders(riderList);
      setMapRiders(map.riders);
      setMapOrders(map.orders);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load trips.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Trips &amp; dispatch</h1>
        <p className="text-sm text-muted">Live trips, who has them, and the ones automatic dispatch could not place.</p>
      </div>

      <DispatchMap riders={mapRiders} orders={mapOrders} />

      <DispatchSettingsCard />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'out'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={clsx('rounded-full px-4 py-2 text-sm font-medium', filter === f ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')}
            >
              {f === 'all' ? 'All live trips' : 'Out of offers'}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{total} {filter === 'out' ? 'waiting for manual assignment' : 'live'}</span>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Trip</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Rider</th>
              <th className="p-4 font-medium">Offers</th>
              <th className="p-4 font-medium">Assign</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const firstOrder = row.orderIds[0];
              const statuses = [...new Set(row.statuses)].map((s) => STATUS_LABELS[s] ?? s).join(' · ');
              return (
                <tr key={row.scopeId} className={clsx('border-b border-border align-top last:border-0', row.outOfOffers && 'bg-red-50/40')}>
                  <td className="p-4">
                    {firstOrder ? (
                      <Link href={`/orders/${firstOrder}`} className="font-semibold text-ink hover:underline">
                        #{row.scopeId.slice(0, 6).toUpperCase()}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">#{row.scopeId.slice(0, 6).toUpperCase()}</span>
                    )}
                    <p className="text-xs text-muted">
                      {row.tripId ? `${row.legs}-stop trip` : 'Single order'} · {formatCurrency(row.total)}
                    </p>
                    <p className="text-xs text-muted">{row.storeNames.join(', ')}</p>
                    {row.placedAt && <p className="text-[11px] text-muted">Placed {formatDateTime(row.placedAt)}</p>}
                  </td>
                  <td className="p-4 text-ink-soft">
                    {statuses}
                    {row.outOfOffers && (
                      <span className="mt-1 block w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">Out of offers</span>
                    )}
                    {!row.outOfOffers && row.awaitingRider && (
                      <span className="mt-1 block w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Waiting for rider</span>
                    )}
                  </td>
                  <td className="p-4">
                    {row.riderName ? <span className="font-medium text-ink">{row.riderName}</span> : <span className="text-muted">Unassigned</span>}
                  </td>
                  <td className="p-4 text-xs text-ink-soft">
                    {row.attempts > 0 ? (
                      <>
                        <p>
                          {row.attempts} ring{row.attempts === 1 ? '' : 's'} offered{row.radiusKm != null ? ` · now ${row.radiusKm} km` : ''}
                        </p>
                        {row.lastOfferAt && <p className="text-muted">last offer {formatRelativeTime(row.lastOfferAt)}</p>}
                      </>
                    ) : (
                      <span className="text-muted">{row.awaitingRider ? 'Not offered yet' : '—'}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {row.awaitingRider && row.assignOrderId ? (
                      <AssignRiderRow
                        order={{ id: row.assignOrderId, tripId: row.tripId, storeName: row.storeNames.join(', '), amount: row.total }}
                        riders={riders}
                      />
                    ) : (
                      <span className="text-xs text-muted">{row.riderName ? 'Change rider from the order page' : 'Waiting for the store to pack'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  {filter === 'out' ? 'Every waiting trip still has offers going out.' : 'No live trips right now.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-border bg-card px-4 py-2 disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border bg-card px-4 py-2 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
