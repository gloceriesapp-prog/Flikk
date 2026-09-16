'use client';

// Rolling 7-day sales trend for the Overview page. Built with the same
// plain recharts + app-card pattern the Analytics page's own charts
// already use (see (dashboard)/analytics/page.tsx) rather than pulling in
// shadcn's separate ui/card + ui/chart wrapper components, which don't
// exist anywhere else in this app — one chart isn't worth a second
// charting abstraction living alongside the first.

import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatInr, formatInrCompact } from '@/lib/format';

export interface DailySales {
  /** ISO date string, midnight local time, one entry per day. */
  date: string;
  revenue: number;
}

interface Props {
  data: DailySales[];
  trendPercent: number;
}

function weekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' });
}

function TooltipCard({ active, payload }: { active?: boolean; payload?: { payload: DailySales }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="text-xs text-neutral-400">{formatDate(point.date)}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-900">{formatInr(point.revenue)}</p>
    </div>
  );
}

export function WeeklySalesChart({ data, trendPercent }: Props) {
  const rangeLabel = data.length ? `${formatDate(data[0].date)} – ${formatDate(data[data.length - 1].date)}` : '';

  return (
    <div className="flex h-[420px] w-full flex-col rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-black">Weekly sales</p>
          <p className="mt-0.5 text-sm text-neutral-400">{rangeLabel}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          {trendPercent >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%" className="mt-4 min-h-0 flex-1">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="weeklySalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={weekdayShort}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 13, fill: '#a3a3a3' }}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatInrCompact}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 13, fill: '#a3a3a3' }}
          />
          <Tooltip content={<TooltipCard />} cursor={{ stroke: '#e5e5e5', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill="url(#weeklySalesFill)" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 flex shrink-0 items-center gap-2 border-t border-neutral-100 pt-4">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold ${
            trendPercent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {trendPercent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(trendPercent).toFixed(1)}%
        </span>
        <span className="text-[13px] text-neutral-400">vs last week</span>
      </div>
    </div>
  );
}
