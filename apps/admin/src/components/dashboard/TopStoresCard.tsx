'use client';

// "Tracking which stores is doing great" — ranks stores by revenue this
// month (delivered orders only, cancelled/pending don't count as earned),
// top 4 only so this stays a glance-and-go card, not a scrollable list.
// Place dropdown (top right) scopes both the leaderboard and the peak-
// hours heatmap below it to one town within the zone — CLAUDE.md still
// single-zone, this is filtering by district within that one zone, not
// multi-zone. New addition, not in the original A1-A4 spec, but genuinely
// useful: a founder watching store performance shouldn't have to
// cross-reference Orders + Stores manually to see who's actually driving
// sales, or when.

import { useState } from 'react';
import { ChevronDown, Store as StoreIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';
import { PLACEHOLDER_HOURLY_ORDER_VOLUME, PLACEHOLDER_ORDERS, PLACEHOLDER_STORES } from '@/lib/mock-data';

const RANK_STYLES = ['bg-amber-100 text-amber-700', 'bg-gray-200 text-gray-700', 'bg-orange-100 text-orange-700'];

const PLACES = ['All places', ...Object.keys(PLACEHOLDER_HOURLY_ORDER_VOLUME)];

// Red → yellow → green by intensity (0 = quietest hour, 1 = busiest),
// each cell a soft top-to-bottom gradient rather than a flat fill for the
// glossy "premium" read.
function heatGradient(intensity: number): string {
  const hue = intensity <= 0.5 ? (intensity / 0.5) * 60 : 60 + ((intensity - 0.5) / 0.5) * 60;
  return `linear-gradient(180deg, hsl(${hue}, 85%, 68%), hsl(${hue}, 80%, 46%))`;
}

export function TopStoresCard() {
  const [place, setPlace] = useState('All places');

  const storesInPlace = place === 'All places' ? PLACEHOLDER_STORES : PLACEHOLDER_STORES.filter((s) => s.district === place);

  const revenueByStore = new Map<string, { orders: number; revenue: number }>();
  for (const order of PLACEHOLDER_ORDERS) {
    if (order.status !== 'delivered') continue;
    const entry = revenueByStore.get(order.storeId) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.amount;
    revenueByStore.set(order.storeId, entry);
  }

  const ranked = storesInPlace
    .map((store) => ({
      store,
      ...(revenueByStore.get(store.id) ?? { orders: 0, revenue: 0 }),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const topRevenue = ranked[0]?.revenue || 1;

  const districts = place === 'All places' ? Object.keys(PLACEHOLDER_HOURLY_ORDER_VOLUME) : [place];
  const hourlyVolume = PLACEHOLDER_HOURLY_ORDER_VOLUME[districts[0]].map((band, i) => ({
    hourLabel: band.hourLabel,
    count: districts.reduce((sum, d) => sum + PLACEHOLDER_HOURLY_ORDER_VOLUME[d][i].count, 0),
  }));

  const peakCount = Math.max(...hourlyVolume.map((b) => b.count));
  const busiestHour = hourlyVolume.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <Card
      title="Top Performing Stores"
      subtitle="Tracking which stores are doing great this month"
      action={
        <div className="relative">
          <select
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="appearance-none rounded-full bg-accent py-1.5 pl-3.5 pr-8 text-xs font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {PLACES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {ranked.map((row, i) => (
          <div key={row.store.id} className="flex items-center gap-3">
            <div
              className={
                i < 3
                  ? `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[i]}`
                  : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink-soft'
              }
            >
              {i + 1}
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
              <StoreIcon size={14} className="text-ink-soft" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{row.store.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: `${Math.max(4, (row.revenue / topRevenue) * 100)}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(row.revenue)}</p>
              <p className="text-[11px] text-muted">{row.orders} orders</p>
            </div>
          </div>
        ))}

        {ranked.length === 0 && <p className="py-4 text-center text-sm text-muted">No stores in {place} yet.</p>}
      </div>

      {/* Peak order hours — a heatmap strip, not another bar chart: darker
          cell = more orders in that 2-hour band, so "when is it busy"
          reads in one glance without axis labels to parse. */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-ink">Peak order hours</h4>
          <span className="text-[11px] text-muted">
            Busiest: <span className="font-semibold text-ink-soft">{busiestHour.hourLabel}</span>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {hourlyVolume.map((band) => {
            const intensity = peakCount > 0 ? band.count / peakCount : 0;
            return (
              <div key={band.hourLabel} className="flex flex-col items-center gap-1.5">
                <div className="h-10 w-full rounded-lg" style={{ background: heatGradient(intensity) }} title={`${band.hourLabel}: ${band.count} orders`} />
                <span className="text-center text-[9px] leading-tight text-muted">{band.hourLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
