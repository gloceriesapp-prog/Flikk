'use client';

import { Tracker } from '@/components/Tracker';
import type { PartnerProduct } from '@/lib/partnerApi';
import { productStockTracker } from './stockPresentation';

export function ProductStockCell({ product }: { product: PartnerProduct }) {
  const { stock, segments } = productStockTracker(product);
  return (
    <div className="flex w-[160px] max-w-full min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${stock.text}`}>{stock.label}</span>
        <span className="tnum shrink-0 text-[15px] font-semibold text-gray-950" aria-label={stock.quantity == null ? 'Quantity not tracked' : `${stock.quantity} units left`}>
          {stock.quantity ?? '—'}
        </span>
      </div>
      <Tracker data={segments} label={`${product.name}: ${stock.label}, ${stock.quantity == null ? 'quantity not tracked' : `${stock.quantity} units left`}`} className="w-full gap-px [&_[data-tracker-segment]]:h-5 [&_[data-tracker-segment]]:rounded-[1px]" />
    </div>
  );
}
