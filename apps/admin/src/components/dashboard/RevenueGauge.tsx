'use client';

// The reference's "Analytic view" half-donut gauge — total commission
// revenue this week, same shape as the reference's total-shipping-revenue
// gauge.
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

const REVENUE = 42890;
const REVENUE_CHANGE_PCT = 4.2;
const GAUGE_MAX = 60000;

export function RevenueGauge() {
  const filled = Math.min(REVENUE / GAUGE_MAX, 1);
  const data = [
    { value: filled },
    { value: 1 - filled },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              // Fixed pixel radii, not percentages — with cy pinned to the
              // bottom edge for a half-donut, recharts' percentage-radius
              // math resolves against the (zero) space below cy, not the
              // available radius above it, collapsing the whole pie to a
              // single point. Confirmed via getBoundingClientRect() before
              // this fix: both sectors were 0×0.
              innerRadius={78}
              outerRadius={112}
              cy="100%"
              stroke="none"
            >
              <Cell fill="#101214" />
              <Cell fill="#E7E8EC" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums text-ink">{formatCurrency(REVENUE)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
        <TrendingUp size={13} />
        <span>+{REVENUE_CHANGE_PCT}%</span>
        <span className="font-medium text-muted">this week</span>
      </div>
    </div>
  );
}
