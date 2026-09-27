'use client';

// "Your sales report" block on the Overview page — big total + delta, a
// timeframe toggle (1d / 7d / 30d / 16m / Max), and a dual-series trend chart:
// Sales (₹, left axis) and Orders (count, right axis) drawn together so the
// owner sees revenue AND volume in one view. All numbers are REAL, bucketed
// live from the store's own orders (same PartnerOrder[] the page fetched) —
// nothing invented. Cancelled orders never count toward sales; they still
// count as placed volume under Orders.

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr, formatInrCompact } from '@/lib/format';

type Timeframe = '1d' | '7d' | '30d' | '16m' | 'max';
type Unit = 'hour' | 'day' | 'month';

const SALES_COLOR = '#059669';
const ORDERS_COLOR = '#6366F1';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '1d', label: '1d' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '16m', label: '16m' },
  { key: 'max', label: 'Max' },
];

interface Bucket {
  label: string;
  sales: number;
  orders: number;
}

function startOfHour(d: Date) { const x = new Date(d); x.setMinutes(0, 0, 0); return x; }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }

// One base Date per bucket, oldest→newest, plus how to slot an order into it.
function buildBuckets(tf: Timeframe, firstOrder: Date | null): { unit: Unit; bases: Date[] } {
  const now = new Date();
  if (tf === '1d') {
    const end = startOfHour(now);
    return { unit: 'hour', bases: Array.from({ length: 24 }, (_, i) => new Date(end.getTime() - (23 - i) * 3600e3)) };
  }
  if (tf === '7d' || tf === '30d') {
    const n = tf === '7d' ? 7 : 30;
    const end = startOfDay(now);
    return { unit: 'day', bases: Array.from({ length: n }, (_, i) => new Date(end.getTime() - (n - 1 - i) * 86400e3)) };
  }
  // month-bucketed: 16m = last 16 months; Max = first order month → now (capped 36).
  const end = startOfMonth(now);
  let months = 16;
  if (tf === 'max' && firstOrder) {
    const f = startOfMonth(firstOrder);
    months = Math.min(36, (end.getFullYear() - f.getFullYear()) * 12 + (end.getMonth() - f.getMonth()) + 1);
  }
  months = Math.max(1, months);
  return {
    unit: 'month',
    bases: Array.from({ length: months }, (_, i) => {
      const b = new Date(end);
      b.setMonth(b.getMonth() - (months - 1 - i));
      return b;
    }),
  };
}

function bucketIndex(unit: Unit, base0: Date, d: Date, len: number): number {
  let idx: number;
  if (unit === 'hour') idx = Math.floor((startOfHour(d).getTime() - base0.getTime()) / 3600e3);
  else if (unit === 'day') idx = Math.floor((startOfDay(d).getTime() - base0.getTime()) / 86400e3);
  else idx = (d.getFullYear() - base0.getFullYear()) * 12 + (d.getMonth() - base0.getMonth());
  return idx >= 0 && idx < len ? idx : -1;
}

function labelFor(unit: Unit, tf: Timeframe, d: Date): string {
  if (unit === 'hour') return d.toLocaleTimeString('en-IN', { hour: 'numeric' });
  if (unit === 'day') return tf === '7d' ? d.toLocaleDateString('en-IN', { weekday: 'short' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bucket }[] }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="min-w-[180px] rounded-xl border border-hairline bg-white px-3.5 py-3 shadow-lg">
      <p className="text-[12px] font-medium text-neutral-500">{b.label}</p>
      <div className="mt-2 flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-[13px] text-neutral-600">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SALES_COLOR }} />
          Sales
        </span>
        <span className="text-[13px] font-semibold text-neutral-900 tnum">{formatInr(b.sales)}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-[13px] text-neutral-600">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ORDERS_COLOR }} />
          Orders
        </span>
        <span className="text-[13px] font-semibold text-neutral-900 tnum">{b.orders}</span>
      </div>
    </div>
  );
}

export function SalesReportChart({ orders }: { orders: PartnerOrder[] }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const { data, total, orderTotal, prevTotal } = useMemo(() => {
    const firstOrder = orders.length ? orders.reduce((min, o) => (o.placed_at < min ? o.placed_at : min), orders[0].placed_at) : null;
    const { unit, bases } = buildBuckets(timeframe, firstOrder ? new Date(firstOrder) : null);
    const buckets: Bucket[] = bases.map((b) => ({ label: labelFor(unit, timeframe, b), sales: 0, orders: 0 }));

    // Previous equal-length window sits immediately before bases[0], for the delta pill.
    const windowMs = bases.length > 1 ? bases[1].getTime() - bases[0].getTime() : 86400e3;
    const prevStart = new Date(bases[0].getTime() - bases.length * windowMs);
    let prevSum = 0;

    for (const o of orders) {
      const d = new Date(o.placed_at);
      const idx = bucketIndex(unit, bases[0], d, bases.length);
      if (idx >= 0) {
        buckets[idx].orders += 1;
        if (o.status !== 'cancelled') buckets[idx].sales += o.total;
      } else if (d >= prevStart && d < bases[0] && o.status !== 'cancelled') {
        prevSum += o.total;
      }
    }

    const salesTotal = buckets.reduce((s, b) => s + b.sales, 0);
    const ordersCount = buckets.reduce((s, b) => s + b.orders, 0);
    return { data: buckets, total: salesTotal, orderTotal: ordersCount, prevTotal: prevSum };
  }, [orders, timeframe]);

  const deltaAbs = total - prevTotal;
  const deltaPct = prevTotal > 0 ? (deltaAbs / prevTotal) * 100 : total > 0 ? 100 : 0;
  const up = deltaPct >= 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xl font-semibold text-black tracking-tight">Sales Performance</span>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="text-5xl leading-none font-bold tracking-tight text-black tnum">
              {formatInr(total)}
            </p>
            <span className={`mb-0.5 flex items-center gap-0.5 text-[13px] font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {up ? '+' : '−'}{Math.abs(deltaPct).toFixed(1)}%
            </span>
          </div>
        
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* Timeframe as the image's calendar dropdown chip — same real options,
              just a select instead of the old pill row below the header. */}
          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="appearance-none rounded-full border border-hairline bg-neutral-50 py-2 pl-9 pr-8 text-[13px] font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-100"
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* Two-series legend — only the two REAL series exist (sales ₹, orders
              count); no invented Earning/Profit line. */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SALES_COLOR }} />
              Sales
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ORDERS_COLOR }} />
              Orders
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220} className="mt-5">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#EFEFEF" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} tickMargin={12} minTickGap={16} />
          <YAxis
            yAxisId="sales"
            tickFormatter={(v: number) => formatInrCompact(v)}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 12, fill: '#a3a3a3' }}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fontSize: 12, fill: '#a3a3a3' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e5e5', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke={ORDERS_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
          <Line
            yAxisId="sales"
            type="monotone"
            dataKey="sales"
            stroke={SALES_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
