'use client';

// Read-only live map for the dispatch page — online riders (green, pulsing
// ring) and every live order's pickup (ink) and drop (amber) pin, with a thin
// line pairing each store to its customer. Client-only: this module imports
// Leaflet (which touches `window`) at load, so the page pulls it in via
// next/dynamic with ssr:false — it never runs on the server.
//
// Admin's own neutral palette (globals.css), deliberately not the
// customer/partner lime/coral system. OpenStreetMap raster tiles — free, no
// key, no paid service (cost ceiling).

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import type { MapOrder, MapRider } from '@/lib/dispatchMap';

// Launch zone (Kaup / outer Udupi) — the initial view before any marker, and
// the fallback when nothing is live. Admin keeps whatever it pans to after.
const ZONE_CENTER: [number, number] = [13.2167, 74.7667];

const INK = '#101214';
const RIDER = '#16a34a'; // success green — the live, moving element
const DROP = '#f59e0b'; // warning amber — the customer destination

function dot(color: string, ring: boolean): L.DivIcon {
  const halo = ring ? `,0 0 0 6px ${color}33` : '';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)${halo}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const RIDER_ICON = dot(RIDER, true);
const STORE_ICON = dot(INK, false);
const CUSTOMER_ICON = dot(DROP, false);

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
};

function LegendDot({ color, ring, label }: { color: string; ring?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <span
        className="inline-block h-3 w-3 rounded-full border-2 border-white"
        style={{ background: color, boxShadow: `0 0 0 1px rgba(0,0,0,0.25)${ring ? `,0 0 0 4px ${color}33` : ''}` }}
      />
      {label}
    </span>
  );
}

export default function DispatchMap({ riders, orders }: { riders: MapRider[]; orders: MapOrder[] }) {
  const center = useMemo<[number, number]>(() => {
    const first = riders[0] ?? orders.find((o) => o.store)?.store ?? orders.find((o) => o.customer)?.customer;
    return first ? [first.lat, first.lng] : ZONE_CENTER;
  }, [riders, orders]);

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Live map</h3>
        <div className="flex flex-wrap items-center gap-4">
          <LegendDot color={RIDER} ring label={`Riders online (${riders.length})`} />
          <LegendDot color={INK} label="Store pickup" />
          <LegendDot color={DROP} label="Customer" />
        </div>
      </div>
      <div className="h-[460px] overflow-hidden rounded-2xl border border-border">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full" style={{ background: '#eef1f5' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {orders.map((order) =>
            order.store && order.customer ? (
              <Polyline key={`line-${order.id}`} positions={[[order.store.lat, order.store.lng], [order.customer.lat, order.customer.lng]]} pathOptions={{ color: INK, weight: 1, opacity: 0.35, dashArray: '4 4' }} />
            ) : null,
          )}
          {orders.map((order) => (
            <Fragment key={order.id} order={order} />
          ))}
          {riders.map((rider) => (
            <Marker key={rider.id} position={[rider.lat, rider.lng]} icon={RIDER_ICON}>
              <Popup>
                <strong>{rider.name}</strong>
                <br />
                Online now
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// Store + customer pins for one order, each only when it has a coordinate.
function Fragment({ order }: { order: MapOrder }) {
  const status = STATUS_LABELS[order.status] ?? order.status;
  return (
    <>
      {order.store && (
        <Marker position={[order.store.lat, order.store.lng]} icon={STORE_ICON}>
          <Popup>
            <strong>{order.storeName}</strong>
            <br />
            Pickup · {status}
          </Popup>
        </Marker>
      )}
      {order.customer && (
        <Marker position={[order.customer.lat, order.customer.lng]} icon={CUSTOMER_ICON}>
          <Popup>
            Customer drop
            <br />
            {status}
          </Popup>
        </Marker>
      )}
    </>
  );
}
