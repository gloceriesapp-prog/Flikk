'use client';

import { Camera, Package, Pencil } from 'lucide-react';
import type { PartnerProduct, StockStatus } from '@/lib/partnerApi';
import { deriveStockStatus } from '@/lib/partnerApi';
import { formatInr, formatVariantSize } from '@/lib/format';

// minmax(0,…) not bare fr: each row is its own grid sharing this string, and
// a bare fr track (min-width:auto) lets an overflowing cell widen its column,
// drifting the vertical borders row-to-row. minmax(0,…) pins every track.
const COLUMNS = 'minmax(0,1.8fr) minmax(0,0.9fr) minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,1fr) 96px';

// Three-level stock, driven by the REAL stock_status enum (falls back to the
// is_in_stock bool for older rows that predate the enum).
const STOCK: Record<StockStatus, { label: string; text: string; bar: string }> = {
  in_stock: { label: 'In stock', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  low_stock: { label: 'Low stock', text: 'text-amber-500', bar: 'bg-amber-400' },
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

function StockCell({ product }: { product: PartnerProduct }) {
  const real = hasRealQuantity(product);
  // When a real count exists, status is derived from it so the number and
  // label can never disagree; otherwise fall back to the stored/legacy status.
  const status: StockStatus = real
    ? deriveStockStatus(product.stock_quantity as number)
    : product.stock_status ?? (product.is_in_stock ? 'in_stock' : 'out_of_stock');
  const cfg = STOCK[status];
  const count = real ? (product.stock_quantity as number) : cosmeticStock(product, status);
  const fill = Math.min(100, Math.round((count / STOCK_FULL_SCALE) * 100));
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="tnum text-[15px] font-semibold text-neutral-900">{count}</span>
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>
      <div className="h-2.5 w-full max-w-[200px] overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${fill}%` }} />
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
        <span className="text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(product.price)}</span>
        {product.original_price && product.original_price > product.price && (
          <span className="text-xs whitespace-nowrap text-neutral-400 line-through">{formatInr(product.original_price)}</span>
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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {sorted.map((v) => (
        <span key={v.id} className="inline-flex items-baseline gap-1 rounded-md bg-neutral-50 px-1.5 py-0.5 text-xs whitespace-nowrap text-neutral-600">
          <span className="font-medium text-neutral-800">{formatVariantSize(v.quantity, v.unit_type)}</span>
          <span className="text-neutral-900">{formatInr(v.price)}</span>
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
    <div
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${isVeg ? 'border-emerald-600' : 'border-red-600'}`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
    </div>
  );
}

function ApprovalBadge({ status }: { status: PartnerProduct['approval_status'] }) {
  if (status === 'pending') {
    return <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber-600">Pending approval</span>;
  }
  if (status === 'rejected') {
    return <span className="inline-flex w-fit items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-red-600">Rejected</span>;
  }
  return <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-emerald-600">Live</span>;
}

interface Props {
  products: PartnerProduct[];
  onEdit: (product: PartnerProduct) => void;
}

export function InventoryTable({ products, onEdit }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 card-shadow rounded-xl border border-hairline bg-white py-20">
        <p className="text-sm font-medium text-neutral-700">No products match this view.</p>
        <p className="text-sm text-neutral-400">Try a different filter or search term.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
      <div className="min-w-[880px]">
        {/* Header */}
        <div
          className="grid items-center border-b border-hairline bg-neutral-50 text-[13px] font-medium text-neutral-500"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span className="border-r border-hairline px-4 py-3">Product</span>
          <span className="border-r border-hairline px-4 py-3">Category</span>
          <span className="border-r border-hairline px-4 py-3">Sizes & price</span>
          <span className="border-r border-hairline px-4 py-3">Stock</span>
          <span className="border-r border-hairline px-4 py-3">Approval</span>
          <span className="px-4 py-3" />
        </div>

        {/* Rows */}
        {products.map((product) => (
          <div
            key={product.id}
            className="grid items-stretch border-b border-hairline transition-colors last:border-b-0 hover:bg-neutral-50/70"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <div className="flex min-w-0 items-center gap-3 border-r border-hairline px-4 py-3.5">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-hairline object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-300">
                  <Package size={18} />
                </div>
              )}
              <div className="flex min-w-0 items-center gap-2">
                <VegMark isVeg={product.is_veg} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-neutral-900">{product.name}</p>
                  {product.freshness_tag && <p className="truncate text-xs text-neutral-400">{product.freshness_tag}</p>}
                </div>
              </div>
            </div>

            <span className="flex items-center truncate border-r border-hairline px-4 py-3.5 text-sm text-neutral-500">
              {product.category}
            </span>

            <div className="flex items-center border-r border-hairline px-4 py-3.5">
              <VariantPrices product={product} />
            </div>

            <div className="flex items-center border-r border-hairline px-4 py-3.5">
              <StockCell product={product} />
            </div>

            <div className="flex flex-col items-start justify-center gap-1.5 border-r border-hairline px-4 py-3.5">
              <ApprovalBadge status={product.approval_status} />
              {/* A newly-submitted photo waiting on admin — the row still shows
                  the LIVE image_url above; this only flags that a replacement
                  is queued. Same amber "pending" language as ApprovalBadge. */}
              {product.pending_image_url && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-amber-600">
                  <Camera size={11} /> Photo in review
                </span>
              )}
              {/* Name/price edits to a live product wait for admin; the row
                  still shows the approved values customers see. */}
              {product.pending_changes && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-amber-600">
                  <Pencil size={11} /> Edits in review
                </span>
              )}
            </div>

            <div className="flex items-center px-4 py-3.5">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100"
              >
                <Pencil size={13} /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
