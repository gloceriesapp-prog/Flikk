'use client';

// Real per-app activity trend — backend's own app/api/live-traffic note
// has the full reasoning on why "customer / partner / rider app" is the
// honest equivalent of "website / Android / iOS" here (no web storefront,
// no per-platform install tracking exists on orders). Same interactive
// stacked-area-chart pattern as shadcn's own chart-area-interactive block
// (range select + legend), rebuilt on this app's existing Card + native
// <select> (same picker TopStoresCard already uses) instead of pulling in
// shadcn's separate ui/chart + ui/select components for one chart.

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface TrafficPoint {
  date: string;
  customerApp: number;
  partnerApp: number;
  riderApp: number;
}

interface LiveTraffic {
  points: TrafficPoint[];
  totals: { customerApp: number; partnerApp: number; riderApp: number };
}

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
];

const SERIES = [
  { key: 'customerApp' as const, label: 'Customer app', color: '#2563eb' },
  { key: 'partnerApp' as const, label: 'Partner app', color: '#059669' },
  { key: 'riderApp' as const, label: 'Rider app', color: '#d97706' },
];

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function TooltipCard({ active, payload }: { active?: boolean; payload?: { payload: TrafficPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-ink">{formatDateLabel(point.date)}</p>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-muted">{s.label}</span>
          <span className="ml-auto font-semibold tabular-nums text-ink">{point[s.key]}</span>
        </div>
      ))}
    </div>
  );
}

export function LiveTrafficCard() {
  const [range, setRange] = useState('7d');
  const [traffic, setTraffic] = useState<LiveTraffic | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/live-traffic?range=${range}`);
    if (res.ok) setTraffic(await res.json());
  }, [range]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  useAdminRealtime(load);

  return (
    <Card
      title="Live traffic"
      subtitle="Customer, partner & rider app activity"
      action={
        <div className="relative">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="appearance-none rounded-full bg-accent py-1.5 pl-3.5 pr-8 text-xs font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-baseline gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-lg font-bold tabular-nums text-ink">{traffic?.totals[s.key] ?? '—'}</span>
            <span className="text-xs text-muted">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={traffic?.points ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`liveTraffic-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tick={{ fontSize: 11, fill: '#a3a3a3' }}
              tickMargin={8}
            />
            <Tooltip content={<TooltipCard />} cursor={{ stroke: '#e5e5e5', strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stackId="apps"
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#liveTraffic-${s.key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
