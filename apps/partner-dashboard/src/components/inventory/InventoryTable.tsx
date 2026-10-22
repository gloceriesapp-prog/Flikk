'use client';

import { Camera, Package, Pencil, Star } from 'lucide-react';
import clsx from 'clsx';
import type { PartnerProduct } from '@/lib/partnerApi';
import { ProductPerformance } from './ProductPerformance';
import { ProductStockCell } from './ProductStockCell';
import { formatInr, formatVariantSize } from '@/lib/format';
import { ProductRowActions } from './ProductRowActions';

// minmax(0,…) not bare fr: each row is its own grid sharing this string, and
// a bare fr track (min-width:auto) lets an overflowing cell widen its column,
// drifting cells row-to-row. minmax(0,…) pins every track.
const COLUMNS = '64px minmax(220px,2fr) minmax(140px,1fr) minmax(100px,0.8fr) minmax(150px,1.2fr) minmax(175px,1.2fr) 128px 150px';

// Every size a product comes in renders inside this ONE row — a product
// with a 500 g and a 1 kg variant is one Onion row showing both prices,
// never two separate Onion rows. This is the real backend model
// (product_variants, one product row per item) doing the work; the table
// just has to actually read the array instead of only product.price.
function VariantPrices({ product }: { product: PartnerProduct }) {
  const variants = product.product_variants.length > 0 ? product.product_variants : null;
  if (!variants) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="tnum text-[15px] font-semibold whitespace-nowrap text-ink">{formatInr(product.price)}</span>
        {product.original_price && product.original_price > product.price && (
          <span className="tnum text-xs whitespace-nowrap text-slate-400 line-through">{formatInr(product.original_price)}</span>
        )}
      </div>
    );
  }

  // Normalize to a common base unit before sorting — g/kg and ml/l are the
  // same dimension at different scales, so "500 g" must sort below "1 kg"
  // even though 500 > 1 as raw numbers.
  const baseQuantity = (v: { quantity: number; unit_type: string }) =>
    v.unit_type === 'kg' || v.unit_type === 'l' ? v.quantity * 1000 : v.quantity;
  const sorted = [...variants].sort((a, b) => baseQuantity(a) - baseQuantity(b));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sorted.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-baseline gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs whitespace-nowrap text-slate-500"
        >
          <span className="font-medium text-slate-600">{formatVariantSize(v.quantity, v.unit_type)}</span>
          <span className="tnum font-semibold text-ink">{formatInr(v.price)}</span>
        </span>
      ))}
    </div>
  );
}

// Small filled-square + dot, the standard Indian food-app veg/non-veg mark
// (green = veg, red = non-veg) — real per-product data (`is_veg`), not
// decorative.
function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? 'Veg' : 'Non-veg'}
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${isVeg ? 'border-emerald-600' : 'border-red-600'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
    </span>
  );
}

const STATUS_TEXT = 'inline-flex max-w-full items-start gap-1.5 text-xs font-semibold leading-5';

function ApprovalBadge({ status }: { status: PartnerProduct['approval_status'] }) {
  const presentation = status === 'pending'
    ? { label: 'Pending approval', text: 'text-amber-700', dot: 'bg-amber-500' }
    : status === 'rejected'
      ? { label: 'Rejected', text: 'text-red-600', dot: 'bg-red-600' }
      : { label: 'Live', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  return (
    <span className={clsx(STATUS_TEXT, presentation.text)}>
      <span aria-hidden className={clsx('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', presentation.dot)} />
      <span>{presentation.label}</span>
    </span>
  );
}

// A newly-submitted photo / name-price edit waiting on admin — the row still
// shows the LIVE values; these only flag that a replacement is queued. Same
// amber "pending" language as ApprovalBadge.
function ReviewFlags({ product }: { product: PartnerProduct }) {
  return (
    <>
      {product.pending_image_url && (
        <span className={clsx(STATUS_TEXT, 'text-amber-700')}>
          <Camera size={13} className="mt-1 shrink-0" aria-hidden /><span>Photo in review</span>
        </span>
      )}
      {product.pending_changes && (
        <span className={clsx(STATUS_TEXT, 'text-amber-700')}>
          <Pencil size={13} className="mt-1 shrink-0" aria-hidden /><span>Edits in review</span>
        </span>
      )}
    </>
  );
}

// Product photo, or a neutral gray tile with a package glyph when there
// isn't one yet (most kirana rows start without a photo).
export function ProductThumb({ src, size = 'md' }: { src: string | null; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={clsx(box, 'shrink-0 bg-slate-100 object-cover')} />;
  }
  return (
    <span className={clsx(box, 'flex shrink-0 items-center justify-center bg-gray-100 text-gray-500')}>
      <Package size={size === 'lg' ? 22 : 19} strokeWidth={1.75} />
    </span>
  );
}

function ProductName({ product }: { product: PartnerProduct }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <VegMark isVeg={product.is_veg} />
        <p className="truncate text-[15px] font-semibold text-gray-950" title={product.name}>
          {product.name}
        </p>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        Review: <span className="ml-0.5 font-semibold text-gray-950">{product.inventory_metrics?.rating != null ? product.inventory_metrics.rating.toFixed(1) : '—'}</span>
        <Star size={12} fill="currentColor" className="text-gray-950" aria-hidden />
      </p>
      {product.freshness_tag && <p className="mt-0.5 truncate text-xs text-slate-400">{product.freshness_tag}</p>}
    </div>
  );
}

interface Props {
  products: PartnerProduct[];
  onEdit: (product: PartnerProduct) => void;
  onDelete: (product: PartnerProduct) => void;
}

// Rows only — the page wraps this in its Card (with the filter bar above) and
// owns the empty / loading / error states.
export function InventoryTable({ products, onEdit, onDelete }: Props) {
  return (
    <>
      {/* ≥ md: a roomy grid table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div
              className="grid items-stretch divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 text-[14px] font-semibold text-gray-900"
              style={{ gridTemplateColumns: COLUMNS }}
            >
              <span className="px-3 py-3 text-center">Sl no.</span>
              <span className="px-5 py-3">Product</span>
              <span className="px-4 py-3">Performance</span>
              <span className="px-4 py-3">Category</span>
              <span className="px-4 py-3">Sizes & price</span>
              <span className="px-4 py-3">Stock</span>
              <span className="px-4 py-3">Status</span>
              <span className="px-5 py-3 text-right">
                <span>Actions</span>
              </span>
            </div>

            <div className="divide-y divide-gray-200/70">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="grid items-stretch divide-x divide-gray-200 transition-colors hover:bg-gray-50/70"
                  style={{ gridTemplateColumns: COLUMNS }}
                >
                  <span className="tnum flex items-center justify-center px-3 py-4 text-center text-sm font-medium text-gray-500">{index + 1}</span>
                  <div className="flex min-w-0 items-center gap-3 px-5 py-4">
                    <ProductThumb src={product.image_url} />
                    <ProductName product={product} />
                  </div>
                  <div className="flex items-center px-4 py-4"><ProductPerformance product={product} /></div>
                  <div className="flex min-w-0 items-center px-4 py-4 text-sm text-slate-500"><span className="truncate">{product.category}</span></div>
                  <div className="flex items-center px-4 py-4">
                    <VariantPrices product={product} />
                  </div>
                  <div className="flex items-center px-4 py-4">
                    <ProductStockCell product={product} />
                  </div>
                  <div className="flex flex-col items-start justify-center gap-1.5 px-4 py-4">
                    <ApprovalBadge status={product.approval_status} />
                    <ReviewFlags product={product} />
                  </div>
                  <div className="flex items-center justify-end px-3 py-4">
                    <ProductRowActions product={product} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* < md: stacked product cards — no sideways scrolling on a phone */}
      <ul className="divide-y divide-gray-200/70 border-t border-slate-100 md:hidden">
        {products.map((product, index) => (
          <li key={product.id} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="tnum pt-3 text-xs font-medium text-gray-500" aria-label={`Serial number ${index + 1}`}>{index + 1}</span>
              <ProductThumb src={product.image_url} />
              <div className="min-w-0 flex-1">
                <ProductName product={product} />
                <p className="mt-0.5 truncate text-xs text-slate-500">{product.category}</p>
              </div>
              <ProductRowActions product={product} onEdit={onEdit} onDelete={onDelete} />
            </div>
            <VariantPrices product={product} />
            <ProductPerformance product={product} />
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <ProductStockCell product={product} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <ApprovalBadge status={product.approval_status} />
                <ReviewFlags product={product} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
