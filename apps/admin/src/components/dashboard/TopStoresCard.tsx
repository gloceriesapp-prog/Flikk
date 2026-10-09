// "Which stores are actually performing" — a plain ranked table, real data
// throughout: daily order count (placed today) and total order count
// (all-time) both come from app/api/overview's SQL aggregate (no row cap), and
// rating is stores.rating itself — a real, continuously recomputed average
// (backend/src/routes/reviews.ts updates it on every new review), not a
// placeholder. Top 5 rows only, nothing else on this card — the old
// revenue leaderboard, place-picker, peak-hours heatmap, and weekly trend
// chart are gone; this table is the whole card now.

import { Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/format';

export interface TopStoreRow {
  storeId: string;
  name: string;
  district: string;
  dailyOrders: number;
  totalOrders: number;
  rating: number | null;
}

export function TopStoresCard({ topStores }: { topStores: TopStoreRow[] }) {
  const ranked = topStores.slice(0, 5);

  return (
    <Card title="Performing store" subtitle="Top 5 stores by total orders">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2.5 pr-4 font-medium">Store name</th>
              <th className="pb-2.5 pr-4 text-right font-medium">Daily order</th>
              <th className="pb-2.5 pr-4 text-right font-medium">Total orders</th>
              <th className="pb-2.5 text-right font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => (
              <tr key={row.storeId} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-ink">
                  {i + 1}. {row.name}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink-soft">{formatNumber(row.dailyOrders)}</td>
                <td className="py-3 pr-4 text-right font-semibold tabular-nums text-ink">{formatNumber(row.totalOrders)}</td>
                <td className="py-3 text-right">
                  {row.rating !== null ? (
                    <span className="inline-flex items-center gap-1 tabular-nums text-ink-soft">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {row.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {ranked.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted">
                  No stores yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
