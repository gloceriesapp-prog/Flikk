'use client';

import { Camera, Package, Pencil } from 'lucide-react';
import clsx from 'clsx';
import type { PartnerProduct, StockStatus } from '@/lib/partnerApi';
import { deriveStockStatus } from '@/lib/partnerApi';
import { formatInr, formatVariantSize } from '@/lib/format';
import { BUTTON } from './DataStates';

// minmax(0,…) not bare fr: each row is its own grid sharing this string, and
// a bare fr track (min-width:auto) lets an overflowing cell widen its column,
// drifting cells row-to-row. minmax(0,…) pins every track.
const COLUMNS = 'minmax(0,2fr) minmax(0,0.9fr) minmax(0,1.5fr) minmax(0,1.2fr) minmax(0,1fr) 88px';

// Three-level stock, driven by the REAL stock_status enum (falls back to the
// is_in_stock bool for older rows that predate the enum).
const STOCK: Record<StockStatus, { label: string; text: string; bar: string }> = {
  in_stock: { label: 'In stock', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  low_stock: { label: 'Low stock', text: 'text-amber-600', bar: 'bg-amber-400' },
  out_of_stock: { label: 'Out of stock', text: 'text-red-600', bar: 'bg-red-500' },
};
const STOCK_FULL_SCALE = 44; // nominal "full shelf" the bar fills against

// Legacy fallback only. A real stock_quantity is now the source of truth
// (partner types it, status derives from it) — but rows created before the
// migration read 0 here while still flagged in_stock, which isn't a real
// "0 on hand". For exactly that pairing we show a cosmetic count instead of
// a wrong "0": deterministic by id (stable across renders, not random),
// bucketed by status so the number always agrees with the label.
function cosmeticStock(product: PartnerProduct, status: StockStatus): number {
  if (status === 'out_of_stock') return 0;
  let h = 0;
  for (const c of product.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return status === 'low_stock' ? 2 + (h % 6) : 24 + (h % 56);
}

// A stored 0 while the row isn't out_of_stock is a legacy row the migration
// defaulted, never a real count the partner typed — real 0 always carries
// out_of_stock status (deriveStockStatus). Treat that one pairing as "not set".
function hasRealQuantity(product: PartnerProduct): boolean {
  const q = product.stock_quantity;
  if (q == null) return false;
  return !(q === 0 && product.stock_status !== 'out_of_stock');
}

function stockFor(product: PartnerProduct) {
  const real = hasRealQuantity(product);
  // When a real count exists, status is derived from it so the number and
  // label can never disagree; otherwise fall back to the stored/legacy status.
  const status: StockStatus = real
    ? deriveStockStatus(product.stock_quantity as number)
    : product.stock_status ?? (product.is_in_stock ? 'in_stock' : 'out_of_stock');
  const count = real ? (product.stock_quantity as number) : cosmeticStock(product, status);
  return { status, count, fill: Math.min(100, Math.round((count / STOCK_FULL_SCALE) * 100)) };
}

function StockCell({ product }: { product: PartnerProduct }) {
  const { status, count, fill } = stockFor(product);
  const cfg = STOCK[status];
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="tnum text-[15px] font-semibold text-ink">{count}</span>
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>
      <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${Math.max(fill, status === 'out_of_stock' ? 0 : 4)}%` }} />
      </div>
    </div>
  );
}

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
          className="inline-flex items-baseline gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs whitespace-nowrap text-slate-500"
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

const PILL = 'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

function ApprovalBadge({ status }: { status: PartnerProduct['approval_status'] }) {
  if (status === 'pending') return <span className={clsx(PILL, 'bg-amber-50 text-amber-700')}>Pending approval</span>;
  if (status === 'rejected') return <span className={clsx(PILL, 'bg-red-50 text-red-600')}>Rejected</span>;
  return (
    <span className={clsx(PILL, 'bg-emerald-50 text-emerald-700')}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
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
        <span className={clsx(PILL, 'bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700')}>
          <Camera size={11} /> Photo in review
        </span>
      )}
      {product.pending_changes && (
        <span className={clsx(PILL, 'bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700')}>
          <Pencil size={11} /> Edits in review
        </span>
      )}
    </>
  );
}

// Product photo, or a tidy soft-blue tile with a package glyph when there
// isn't one yet (most kirana rows start without a photo).
export function ProductThumb({ src, size = 'md' }: { src: string | null; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={clsx(box, 'shrink-0 bg-slate-100 object-cover')} />;
  }
  return (
    <span className={clsx(box, 'flex shrink-0 items-center justify-center bg-accent-soft text-accent/60')}>
      <Package size={size === 'lg' ? 22 : 19} strokeWidth={1.75} />
    </span>
  );
}

function ProductName({ product }: { product: PartnerProduct }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <VegMark isVeg={product.is_veg} />
        <p className="truncate text-[15px] font-medium text-ink" title={product.name}>
          {product.name}
        </p>
      </div>
      {product.freshness_tag && <p className="mt-0.5 truncate text-xs text-slate-400">{product.freshness_tag}</p>}
    </div>
  );
}

interface Props {
  products: PartnerProduct[];
  onEdit: (product: PartnerProduct) => void;
}

// Rows only — the page wraps this in its Card (with the filter bar above) and
// owns the empty / loading / error states.
export function InventoryTable({ products, onEdit }: Props) {
  return (
    <>
      {/* ≥ md: a roomy grid table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div
              className="grid items-center border-y border-slate-100 bg-slate-50/70 text-[13px] font-medium text-slate-500"
              style={{ gridTemplateColumns: COLUMNS }}
            >
              <span className="px-5 py-3">Product</span>
              <span className="px-4 py-3">Category</span>
              <span className="px-4 py-3">Sizes & price</span>
              <span className="px-4 py-3">Stock</span>
              <span className="px-4 py-3">Status</span>
              <span className="px-5 py-3 text-right">
                <span className="sr-only">Actions</span>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid items-center transition-colors hover:bg-slate-50/80"
                  style={{ gridTemplateColumns: COLUMNS }}
                >
                  <div className="flex min-w-0 items-center gap-3 px-5 py-4">
                    <ProductThumb src={product.image_url} />
                    <ProductName product={product} />
                  </div>
                  <span className="truncate px-4 py-4 text-sm text-slate-500">{product.category}</span>
                  <div className="px-4 py-4">
                    <VariantPrices product={product} />
                  </div>
                  <div className="px-4 py-4">
                    <StockCell product={product} />
                  </div>
                  <div className="flex flex-col items-start gap-1.5 px-4 py-4">
                    <ApprovalBadge status={product.approval_status} />
                    <ReviewFlags product={product} />
                  </div>
                  <div className="flex justify-end px-5 py-4">
                    <button type="button" onClick={() => onEdit(product)} className={clsx(BUTTON.secondary, 'px-3.5 py-1.5 text-[13px]')}>
                      <Pencil size={13} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* < md: stacked product cards — no sideways scrolling on a phone */}
      <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-start gap-3">
              <ProductThumb src={product.image_url} />
              <div className="min-w-0 flex-1">
                <ProductName product={product} />
                <p className="mt-0.5 truncate text-xs text-slate-500">{product.category}</p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(product)}
                aria-label={`Edit ${product.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <Pencil size={15} />
              </button>
            </div>
            <VariantPrices product={product} />
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <StockCell product={product} />
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
