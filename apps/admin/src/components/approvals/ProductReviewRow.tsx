'use client';

// A1 (Products tab) — a product needing a founder decision, either a brand-new
// partner listing (mode 'new' → PATCH /api/products/[id]/approval) or a
// partner-submitted photo swap (mode 'image' → PATCH /api/products/[id]/image-review,
// with a Replace option that uploads a founder-chosen photo through the product
// PATCH route, which clears the pending one), or a partner's name/price edit
// to a live product (mode 'changes' → PATCH /api/products/[id]/change-review,
// shown as live → proposed). Same bordered-card + amber-accent shape as
// ApplicationRow so both tabs read the same.

import { useState } from 'react';
import { Check, Package, X } from 'lucide-react';
import clsx from 'clsx';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import type { Product, ProductVariant } from '@/lib/types';

const UNIT_LABEL: Record<ProductVariant['unitType'], string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

function packLabel(v: ProductVariant): string {
  const mrp = v.originalPrice && v.originalPrice > v.price ? ` (MRP ₹${v.originalPrice})` : '';
  return `${v.quantity} ${UNIT_LABEL[v.unitType]} ₹${v.price}${mrp}`;
}

// Live → proposed, only for what the partner actually changed.
function ChangeSummary({ product }: { product: Product }) {
  const changes = product.pendingChanges;
  if (!changes) return null;
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-xs">
      {changes.name && (
        <p className="text-ink">
          <span className="text-muted">Name:</span> {product.name} → <span className="font-semibold">{changes.name}</span>
        </p>
      )}
      {changes.variants && (
        <p className="text-ink">
          <span className="text-muted">Packs:</span> {product.variants.map(packLabel).join(' · ')} →{' '}
          <span className="font-semibold">{changes.variants.map(packLabel).join(' · ')}</span>
        </p>
      )}
      {!changes.variants && changes.price != null && (
        <p className="text-ink">
          <span className="text-muted">Price:</span> ₹{product.price} → <span className="font-semibold">₹{changes.price}</span>
        </p>
      )}
    </div>
  );
}

function Img({ src, className }: { src?: string; className: string }) {
  if (!src) {
    return (
      <span className={clsx(className, 'grid place-items-center bg-accent text-muted')}>
        <Package size={18} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- same as ProductImageUpload: a Supabase-hosted photo, next/image adds no value here
  return <img src={src} alt="" className={className} />;
}

export function ProductReviewRow({ product, mode, onDone }: { product: Product; mode: 'new' | 'image' | 'changes'; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function call(url: string, body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onDone();
      } else {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        window.alert(b?.error ?? 'Could not update this product.');
      }
    } catch {
      window.alert('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Replace — the founder uploads their own photo instead of the pending one.
  // Goes through the full product PATCH (same call Inventory's edit uses), which
  // writes image_url and nulls pending_image_url in one update. Sends the whole
  // product so validateProductInput's required fields are satisfied.
  function replace(url: string, bgColor: string | null) {
    void call(`/api/products/${product.id}`, { ...product, imageUrl: url, bgColor: bgColor ?? product.bgColor });
  }

  const approvalBody = mode === 'new' ? { approve: true } : { action: 'approve' };
  const rejectBody = mode === 'new' ? { approve: false } : { action: 'reject' };
  const endpoint =
    mode === 'new'
      ? `/api/products/${product.id}/approval`
      : mode === 'image'
        ? `/api/products/${product.id}/image-review`
        : `/api/products/${product.id}/change-review`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 sm:flex-row sm:items-center">
      {mode === 'image' ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Img src={product.imageUrl} className="h-16 w-16 rounded-xl object-cover" />
            <span className="text-[10px] font-medium text-muted">Current</span>
          </div>
          <span className="text-muted">→</span>
          <div className="flex flex-col items-center gap-1">
            <Img src={product.pendingImageUrl ?? undefined} className="h-16 w-16 rounded-xl object-cover ring-2 ring-lime" />
            <span className="text-[10px] font-medium text-muted">Pending</span>
          </div>
        </div>
      ) : (
        <Img src={product.imageUrl} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
        <p className="truncate text-xs text-muted">{product.storeName}</p>
        {mode === 'changes' && <ChangeSummary product={product} />}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {mode === 'image' && <ProductImageUpload imageUrl={undefined} onChange={replace} />}
        <button
          type="button"
          onClick={() => call(endpoint, rejectBody)}
          disabled={busy}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-danger hover:bg-red-50 disabled:opacity-40"
          aria-label="Reject"
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={() => call(endpoint, approvalBody)}
          disabled={busy}
          className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Check size={14} />
          Approve
        </button>
      </div>
    </div>
  );
}
