'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PLACEHOLDER_REVENUE_TREND } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';

export function RevenueTrendChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={PLACEHOLDER_REVENUE_TREND} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E7E8EC" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8A8F98', fontSize: 12 }} />
          {/* Explicit + hidden, same fix as OrdersChart — recharts v3's
              default domain inference isn't reliable without one. */}
          <YAxis hide domain={[0, 'dataMax + 2000']} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            cursor={{ fill: '#F5F6F8' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #E7E8EC', fontSize: 12 }}
          />
          <Bar dataKey="commission" name="Commission" fill="#101214" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
