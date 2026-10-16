import Link from 'next/link';
import clsx from 'clsx';
import { AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardLabel, CornerLink, FOCUS_RING, Thumb } from './parts';
import type { TopProduct } from './dashboardData';

// Best sellers over the last 7 days (units sold, the number a kirana owner
// restocks by), plus a warning row when anything is out of stock.
export function TopProductsCard({ products, outOfStock }: { products: TopProduct[]; outOfStock: number }) {
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <CardLabel icon={TrendingUp} className="text-lg text-ink">
            Top products
          </CardLabel>
          <p className="mt-0.5 pl-[26px] text-sm text-slate-500">Units sold, last 7 days</p>
        </div>
        <CornerLink href="/inventory" label="Open inventory" />
      </div>

      {products.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm text-slate-400">
          Your best sellers will show here after a few orders.
        </p>
      ) : (
        <ul className="mt-2 flex-1 divide-y divide-slate-100">
          {products.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3.5 py-3">
              <Thumb src={p.imageUrl} name={p.name} />
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                <span className="tnum mr-2 text-slate-400">{i + 1}</span>
                {p.name}
              </p>
              <p className="flex shrink-0 items-baseline gap-1.5">
                <span className="tnum text-2xl font-semibold tracking-tight text-ink">{p.unitsSold}</span>
                <span className="text-xs text-accent">sold</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {outOfStock > 0 && (
        <Link
          href="/inventory"
          className={clsx(
            'mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 transition-colors hover:bg-amber-100/70',
            FOCUS_RING,
          )}
        >
          <AlertTriangle size={17} className="shrink-0 text-amber-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="tnum font-semibold">{outOfStock}</span> {outOfStock === 1 ? 'product is' : 'products are'} out of
            stock
          </span>
          <span className="flex shrink-0 items-center font-medium">
            Restock
            <ChevronRight size={16} aria-hidden />
          </span>
        </Link>
      )}
    </Card>
  );
}
