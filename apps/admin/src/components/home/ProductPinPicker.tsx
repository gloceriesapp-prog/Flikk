'use client';

// Hand-picked products for one Home section: the pinned list in show order
// (move up/down, remove) and a search over the whole catalogue to add more.
// The first `capacity` pins are what the phone shows; the rest wait as
// back-ups and slide in when an earlier one sells out.

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Plus, Search, X } from '@/components/icons';
import { formatCurrency } from '@/lib/format';
import { MAX_PINS } from '@/lib/homeSectionPins';
import type { Product } from '@/lib/types';

export function ProductPinPicker({ productIds, products, capacity, onChange }: {
  productIds: string[];
  products: Product[];
  capacity: number;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const pinned = new Set(productIds);
    return products
      .filter((p) => !pinned.has(p.id) && (p.approvalStatus ?? 'approved') === 'approved'
        && (p.name.toLowerCase().includes(q) || p.storeName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, products, productIds]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...productIds];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {productIds.length > 0 ? (
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {productIds.map((id, i) => {
            const product = byId.get(id);
            return (
              <li key={id} className={clsx('flex items-center gap-3 px-3 py-2', i >= capacity && 'bg-accent/60')}>
                <span className="w-5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                {product?.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={product.imageUrl} alt="" className="h-9 w-9 rounded-lg border border-border object-cover" />
                  : <span className="h-9 w-9 rounded-lg bg-accent" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{product?.name ?? 'Removed product'}</p>
                  <p className="truncate text-xs text-muted">
                    {product ? `${product.storeName} · ${formatCurrency(product.price)}${product.stockStatus === 'out_of_stock' ? ' · out of stock' : ''}` : 'No longer in the catalogue'}
                    {i >= capacity && ' · back-up'}
                  </p>
                </div>
                <div className="flex items-center">
                  <button type="button" className="icon-btn h-8 w-8" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className="icon-btn h-8 w-8" aria-label="Move down" disabled={i === productIds.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                  <button type="button" className="icon-btn h-8 w-8 hover:text-danger" aria-label={`Remove ${product?.name ?? 'product'}`}
                    onClick={() => onChange(productIds.filter((other) => other !== id))}><X size={14} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
          No products picked yet. Search below to add the ones that matter most.
        </p>
      )}

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={productIds.length >= MAX_PINS ? `Up to ${MAX_PINS} products per section` : 'Search products, stores or categories'}
          disabled={productIds.length >= MAX_PINS}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-ink"
        />
      </div>
      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {results.map((product) => (
            <li key={product.id}>
              <button type="button" onClick={() => { onChange([...productIds, product.id]); setQuery(''); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent">
                <Plus size={14} className="text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{product.name}</span>
                  <span className="block truncate text-xs text-muted">{product.storeName} · {product.category}</span>
                </span>
                <span className="text-xs tabular-nums text-ink-soft">{formatCurrency(product.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && results.length === 0 && <p className="text-xs text-muted">No approved products match “{query.trim()}”.</p>}
    </div>
  );
}
