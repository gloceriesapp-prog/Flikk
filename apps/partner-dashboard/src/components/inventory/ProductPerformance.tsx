import type { PartnerProduct } from '@/lib/partnerApi';

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export function ProductPerformance({ product }: { product: PartnerProduct }) {
  const sold = product.inventory_metrics?.lifetime_units_sold;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-gray-500">All-time sales</span>
      <span className="tnum text-sm font-semibold text-gray-950" title={sold == null ? 'Sales data unavailable' : `${sold.toLocaleString('en-IN')} units sold in total`}>
        {sold == null ? '—' : `${compact.format(sold)} sold`}
      </span>
    </div>
  );
}
