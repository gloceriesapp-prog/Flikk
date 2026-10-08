'use client';

// A1 (Products tab) — a product needing a founder decision, either a brand-new
// partner listing (mode 'new' → PATCH /api/products/[id]/approval) or a
// partner-submitted photo swap (mode 'image' → PATCH /api/products/[id]/image-review,
// with a Replace option that uploads a founder-chosen photo through the product
// PATCH route, which clears the pending one). Same bordered-card + amber-accent
// shape as ApplicationRow so both tabs read the same.

import { useState } from 'react';
import { Check, Package, X } from 'lucide-react';
import clsx from 'clsx';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import type { Product } from '@/lib/types';

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

export function ProductReviewRow({ product, mode, onDone }: { product: Product; mode: 'new' | 'image'; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, body: unknown) {
    if (busy) return;
    setError(null);
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
        setError(b?.error ?? 'Could not update this product.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
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
  const endpoint = mode === 'new' ? `/api/products/${product.id}/approval` : `/api/products/${product.id}/image-review`;

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
      </div>

      {!!error && <p role="alert" className="text-sm text-danger">{error}</p>}
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
