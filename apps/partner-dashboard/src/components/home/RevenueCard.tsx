'use client';

// "Net earnings" bar chart: one bar per store-local day, today's (or the
// hovered) bar solid accent and the rest a light hatch, like the reference's
// highlighted-bar chart. Net = delivered orders' item_total − commission, the
// money the store actually keeps (lib/orderRevenue.ts), so today's bar always
// equals the "Earnings today" tile.

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr, formatInrCompact } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { CardLabel, CornerLink, RangePill } from './parts';
import { revenueByDay, type RevenueBucket } from './dashboardData';

type Range = '7' | '30';
const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const ACCENT = '#155dfc';
const HATCH_ID = 'revenue-hatch';

export function RevenueCard({ orders, now }: { orders: PartnerOrder[]; now: number }) {
  const [range, setRange] = useState<Range>('7');
  const [hovered, setHovered] = useState<number | null>(null);
  const days = Number(range);

  const buckets = useMemo(() => revenueByDay(orders, days, now), [orders, days, now]);
  const total = buckets.reduce((sum, b) => sum + b.net, 0);
  const delivered = buckets.reduce((sum, b) => sum + b.orders, 0);
  const todayIndex = buckets.findIndex((b) => b.isToday);
  const activeIndex = hovered ?? todayIndex;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardLabel icon={IndianRupee}>Net earnings</CardLabel>
          <p className="tnum mt-3 text-[32px] leading-none font-semibold tracking-tight text-ink">{formatInr(total)}</p>
          <p className="mt-2 text-sm text-slate-500">
            <span className="tnum">{delivered}</span> delivered {delivered === 1 ? 'order' : 'orders'}, after commission
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePill value={range} options={RANGES} onChange={setRange} label="Earnings range" />
          <CornerLink href="/analytics" label="Open analytics" />
        </div>
      </div>

      {/* min-h, not h: flex-1's zero basis would collapse a fixed height when
          the card isn't stretched (single column on phones). */}
      <div className="relative mt-5 min-h-[248px] flex-1">
        {total === 0 && (
          <p className="absolute inset-x-0 top-[38%] z-10 text-center text-sm text-slate-400">
            No delivered orders in this period yet
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={days > 7 ? '18%' : '22%'}
            onMouseMove={(state) => {
              const i = state?.activeTooltipIndex;
              setHovered(i === undefined || i === null ? null : Number(i));
            }}
            onMouseLeave={() => setHovered(null)}
            accessibilityLayer
          >
            <defs>
              <pattern id={HATCH_ID} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="#eef1f6" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="#e2e7ef" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="#eef0f3" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={days > 7 ? 4 : 0}
              tick={(props) => <DayTick {...props} activeLabel={buckets[activeIndex]?.label} />}
              height={30}
            />
            <YAxis
              tickFormatter={(v: number) => formatInrCompact(v)}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={false}
              // Pinned to the top of the plot so it never sits on the bars.
              position={{ y: 0 }}
              defaultIndex={todayIndex >= 0 ? todayIndex : undefined}
              isAnimationActive={false}
            />
            <Bar dataKey="net" radius={days > 7 ? [6, 6, 6, 6] : [12, 12, 12, 12]} minPointSize={total > 0 ? 3 : 0}>
              {buckets.map((b, i) => (
                <Cell key={b.key} fill={i === activeIndex ? ACCENT : `url(#${HATCH_ID})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DayTick({
  x,
  y,
  payload,
  activeLabel,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
  activeLabel?: string;
}) {
  const active = payload?.value === activeLabel;
  return (
    <text
      x={Number(x)}
      y={Number(y) + 14}
      textAnchor="middle"
      fontSize={12}
      fontWeight={active ? 600 : 400}
      fill={active ? ACCENT : '#94a3b8'}
    >
      {payload?.value}
    </text>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: RevenueBucket }[] }) {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-white shadow-lg">
      <p className="text-[11px] text-slate-300">
        {bucket.isToday ? 'Today' : bucket.fullLabel}
      </p>
      <p className="tnum text-sm font-semibold">{formatInr(bucket.net)}</p>
      <p className="tnum text-[11px] text-slate-300">
        {bucket.orders} delivered
      </p>
    </div>
  );
}
