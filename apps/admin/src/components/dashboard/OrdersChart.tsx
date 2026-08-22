'use client';

// Client component — recharts renders to the DOM/canvas, needs the browser.
// The reference's "Shipments Statistics" bar chart, same two-series-per-day
// shape (orders placed vs. delivered instead of shipment vs. delivery).

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PLACEHOLDER_ORDER_STATS } from '@/lib/mock-data';

export function OrdersChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={PLACEHOLDER_ORDER_STATS} barGap={4} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E7E8EC" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8A8F98', fontSize: 12 }} />
          {/* Hidden but explicit — without a YAxis, recharts v3's default
              domain inference left bars rendering at near-zero height
              (confirmed visually: bars shrank to slivers), unlike v2's
              implicit-axis behavior this was written against. */}
          <YAxis hide domain={[0, 'dataMax + 10']} />
          <Tooltip
            cursor={{ fill: '#F5F6F8' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #E7E8EC', fontSize: 12 }}
          />
          <Bar dataKey="orders" name="Orders" fill="#101214" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="delivered" name="Delivered" fill="#C7CCD6" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
