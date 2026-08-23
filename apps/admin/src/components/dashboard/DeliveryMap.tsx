// A map-styled background behind deterministic pins — "just for the UI"
// per the ask, not a live GPS feed. Built as pure CSS (layered gradients
// standing in for terrain/water + a faint road grid), not a fetched tile
// image: an external static-map service is one more thing that can be
// slow, rate-limited, or unreachable, and a broken/half-loaded tile looks
// worse than a clean illustrated map. Pin positions are a stable hash of
// each rider's id, not real coordinates: this stays honest with
// CLAUDE.md's live-GPS-tracking out-of-scope call (the file note on
// DeliveryTrackingCard explains that constraint) while looking like a
// real ops map instead of an abstract dotted line. One pin per rider (not
// per order) — a rider carrying two orders gets one pin with a "×2"
// badge, so the map doesn't stack duplicate pins on the same person.

import { Bike, Store } from 'lucide-react';
import type { ActiveRider } from '@/lib/types';

function hashPercent(seed: string, min: number, max: number): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return min + (hash % 1000) / 1000 * (max - min);
}

export interface RiderPin {
  rider: ActiveRider;
  orderCount: number;
}

// Illustrated map texture — a soft land/water gradient plus a faint road
// grid, entirely CSS (no image request, nothing that can fail to load).
const MAP_BACKGROUND = {
  backgroundColor: '#DCE6DC',
  backgroundImage: [
    'linear-gradient(135deg, rgba(196, 214, 224, 0.9) 0%, rgba(220, 230, 220, 0.9) 55%, rgba(210, 224, 200, 0.9) 100%)',
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 64px)',
    'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 64px)',
  ].join(', '),
} as const;

export function DeliveryMap({ pins }: { pins: RiderPin[] }) {
  const hubX = 50;
  const hubY = 82;

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-2xl" style={MAP_BACKGROUND}>
      {/* Store hub — every route implicitly starts here. */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${hubX}%`, top: `${hubY}%` }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink shadow-md">
          <Store size={12} className="text-white" />
        </div>
      </div>

      {pins.map(({ rider, orderCount }) => {
        const x = hashPercent(rider.id, 15, 85);
        const y = hashPercent(rider.id + 'y', 15, 65);
        return (
          <div key={rider.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            {/* Dashed route from the hub to this rider — same decorative
                convention as the single-order version's path, just per-pin. */}
            <svg className="pointer-events-none absolute -z-10" style={{ overflow: 'visible' }}>
              <line
                x1={0}
                y1={0}
                x2={(hubX - x) * 6.4}
                y2={(hubY - y) * 3.6}
                stroke="white"
                strokeWidth={2}
                strokeDasharray="1 6"
                strokeLinecap="round"
                opacity={0.85}
              />
            </svg>

            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-success shadow-md" title={rider.name}>
              <Bike size={14} className="text-white" />
              {orderCount > 1 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-bold text-white">
                  ×{orderCount}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {pins.length === 0 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-ink-soft">No riders en route right now</span>
        </div>
      )}
    </div>
  );
}
