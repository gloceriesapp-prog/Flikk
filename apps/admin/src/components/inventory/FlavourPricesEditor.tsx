'use client';

import type { ProductOption, ProductVariant } from '@/lib/types';
import { sellingPrice } from '@/lib/productValidation';

type Prices = NonNullable<ProductOption['priceOverrides']>;
export function FlavourPricesEditor({ prices = {}, variants, onChange }: {
  prices?: Prices; variants: ProductVariant[]; onChange: (prices: Prices) => void;
}) {
  const packs = variants.length ? variants.map(v => ({ key: `${v.unitType}:${Number(v.quantity)}`, label: `${v.quantity} ${v.unitType}`, price: sellingPrice(v.price, v.originalPrice), mrp: v.originalPrice }))
    : [{ key: 'base', label: 'Standard pack', price: undefined, mrp: undefined }];
  function change(key: string, field: 'price' | 'originalPrice', value: string) {
    const next = { ...prices };
    const pack = { ...next[key] };
    if (value === '') delete pack[field];
    else pack[field] = Number(value);
    if (pack.price === undefined && pack.originalPrice === undefined) delete next[key];
    else next[key] = pack;
    onChange(next);
  }
  return <fieldset className="rounded-lg bg-accent/50 p-3">
    <legend className="text-xs font-semibold text-ink">Flavour prices</legend>
    <p className="mb-2 text-xs text-muted">Set a store price, MRP, or both for each pack. Blank fields use the product’s pack values when saved. MRP must be at least the store price.</p>
    <div className="space-y-2">{packs.map(pack => <div key={pack.key} className="grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
      <span className="pb-2 text-xs font-medium text-ink">{pack.label}</span>
      <label className="text-xs text-muted">Store price (₹)<input type="number" min="0.01" max="1000000" step="0.01" value={prices[pack.key]?.price ?? ''} placeholder={pack.price ? String(pack.price) : 'Inherit'} onChange={e => change(pack.key, 'price', e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" /></label>
      <label className="text-xs text-muted">MRP (₹)<input type="number" min="0.01" max="1000000" step="0.01" value={prices[pack.key]?.originalPrice ?? ''} placeholder={pack.mrp ? String(pack.mrp) : 'Inherit'} onChange={e => change(pack.key, 'originalPrice', e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-sm text-ink" /></label>
    </div>)}</div>
  </fieldset>;
}
