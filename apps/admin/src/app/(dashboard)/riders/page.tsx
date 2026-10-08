'use client';

// Rider management — active roster + manual assignment (A3/FR22) on one
// screen, since a founder doing either is looking at "who's actually on
// shift right now" either way. Fully manual: no suggested-rider algorithm,
// no auto-assign (specs/00-foundation/out-of-scope.md).
//
// Real data now: app/api/riders (service role — riders has no public RLS
// read policy admin can use) for the roster, app/api/orders (already real,
// shared with the Orders page) for which orders are waiting on a rider.
// useAdminRealtime refetches both on any orders/riders write from the
// customer/partner/rider apps, same pattern as Orders/Overview.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { MapPin, Phone } from 'lucide-react';
import { AssignRiderRow } from '@/components/dispatch/AssignRiderRow';
import { ReasonModal } from '@/components/ui/ReasonModal';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { ActiveRider, Order } from '@/lib/types';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// liveStatus is derived server-side (app/api/riders): a live trip = On
// delivery; online with a heartbeat inside the 3-minute dispatch window =
// Online; anything else (app killed, location off, went offline) = Offline.
const LIVE_STATUS: Record<NonNullable<ActiveRider['liveStatus']>, { label: string; dot: string; text: string }> = {
  on_delivery: { label: 'On delivery', dot: 'bg-blue-500', text: 'font-semibold text-blue-700' },
  online: { label: 'Online', dot: 'bg-success', text: 'font-semibold text-success' },
  offline: { label: 'Offline', dot: 'bg-muted', text: 'text-muted' },
  suspended: { label: 'Suspended', dot: 'bg-danger', text: 'font-semibold text-danger' },
};

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Compact "Mon 09:00–18:00 · Tue 10:00–14:00" summary of a rider's configured
// week — enabled days only, shown as a tooltip so the row stays uncluttered.
function hoursSummary(availability: ActiveRider['availability']): string {
  return availability
    .filter((d) => d.enabled)
    .sort((a, b) => a.day - b.day)
    .map((d) => `${DAY_LABELS[d.day] ?? d.day} ${d.start}–${d.end}`)
    .join(' · ');
}

export default function RidersPage() {
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<ActiveRider | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [ridersRes, ordersRes] = await Promise.all([fetch('/api/riders'), fetch('/api/orders?status=packed&unassigned=1')]);
      if (!ridersRes.ok) throw new Error((await ridersRes.json()).error ?? 'Could not load riders.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      setRiders(await ridersRes.json());
      setOrders(await ordersRes.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load riders.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useAdminRealtime(loadData);

  // Suspend (reason required) / reactivate — admin_set_rider_suspension
  // (migration 110) flips riders.is_active and forces the rider offline.
  async function setSuspension(rider: ActiveRider, suspend: boolean, reason?: string) {
    const res = await fetch(`/api/riders/${rider.id}/suspension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend, reason }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not update the rider.');
    await loadData();
  }

  async function reactivate(rider: ActiveRider) {
    if (!window.confirm(`Reactivate ${rider.name}? They will be able to go online and receive pickups again.`)) return;
    setActionError(null);
    try {
      await setSuspension(rider, false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the rider.');
    }
  }

  const unassigned = orders.filter((o) => o.status === 'packed' && !o.riderId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Riders</h1>
        <p className="text-sm text-muted">Active roster and manual order assignment.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-ink">Riders</h3>
          <div className="flex flex-col gap-3">
            {riders.map((rider) => {
              const hours = hoursSummary(rider.availability);
              const live = LIVE_STATUS[rider.liveStatus ?? 'offline'];
              const staleOnDelivery = rider.liveStatus === 'on_delivery' && !rider.liveNow;
              return (
                <div key={rider.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-accent" />
                    <span title={live.label} className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', live.dot)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{rider.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} />
                      {rider.phone}
                    </p>
                    <p className="mt-0.5 text-[11px]">
                      <span className={live.text}>{live.label}</span>
                      <span className="text-muted">
                        {' · '}
                        {rider.lastSeenAt ? `last seen ${formatRelativeTime(rider.lastSeenAt)}` : 'never seen'}
                      </span>
                      {staleOnDelivery && <span className="font-semibold text-amber-600"> · no recent location</span>}
                    </p>
                    {rider.lastLat != null && rider.lastLng != null && (
                      <a
                        href={mapsUrl(rider.lastLat, rider.lastLng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={rider.lastSeenAt ? `Reported ${formatDateTime(rider.lastSeenAt)}` : undefined}
                        className="mt-0.5 flex w-fit items-center gap-1 text-[11px] font-medium text-ink-soft hover:underline"
                      >
                        <MapPin size={11} />
                        {rider.lastLat.toFixed(5)}, {rider.lastLng.toFixed(5)}
                      </a>
                    )}
                    {!rider.isOnline && rider.suspendedReason && (
                      <p className="mt-0.5 text-[11px] font-semibold text-danger">Suspended: {rider.suspendedReason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      title={hours || undefined}
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        rider.onScheduleNow ? 'bg-green-50 text-success' : 'bg-accent text-muted',
                      )}
                    >
                      {rider.onScheduleNow ? 'On schedule' : 'Off schedule'}
                    </span>
                    <span className="text-xs font-semibold text-ink-soft">
                      {rider.activeTrips ?? rider.activeOrders} active trip{(rider.activeTrips ?? rider.activeOrders) === 1 ? '' : 's'}
                    </span>
                    {rider.isOnline ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setSuspending(rider);
                        }}
                        className="text-[11px] font-semibold text-danger hover:underline"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button type="button" onClick={() => void reactivate(rider)} className="text-[11px] font-semibold text-success hover:underline">
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {riders.length === 0 && <p className="py-8 text-center text-sm text-muted">No riders onboarded yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Unassigned orders</h3>
            <span className="text-xs text-muted">{unassigned.length} waiting</span>
          </div>
          {unassigned.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nothing waiting on a rider right now.</p>
          ) : (
            unassigned.map((order) => (
              <AssignRiderRow key={order.id} order={order} riders={riders} />
            ))
          )}
        </div>
      </div>

      {suspending && (
        <ReasonModal
          title={`Suspend ${suspending.name}`}
          description="The rider is taken offline immediately, stops receiving pickup offers and cannot go online until reactivated. Current deliveries are not unassigned."
          confirmLabel="Suspend rider"
          onClose={() => setSuspending(null)}
          onConfirm={async (reason) => {
            await setSuspension(suspending, true, reason);
            setSuspending(null);
          }}
        />
      )}
    </div>
  );
}
