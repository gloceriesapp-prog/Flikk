'use client';

import { Package, Pencil } from 'lucide-react';
import type { PartnerProduct } from '@/lib/partnerApi';
import { formatInr, formatVariantSize } from '@/lib/format';

const COLUMNS = '2fr 1fr 1.4fr 1fr 1.1fr 80px';

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
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <div className="min-w-[820px]">
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
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                  product.is_in_stock ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {product.is_in_stock ? 'In stock' : 'Out of stock'}
              </span>
            </div>

            <div className="flex items-center border-r border-hairline px-4 py-3.5">
              <ApprovalBadge status={product.approval_status} />
            </div>

            <div className="flex items-center px-4 py-3.5">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
