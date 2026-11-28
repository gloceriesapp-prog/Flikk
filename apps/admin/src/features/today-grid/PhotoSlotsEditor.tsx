'use client';

// A card's photo slots. The card type sets how many (IMAGE_SLOTS: the big
// card rotates up to 4 products, every other card shows 2). Automatic =
// top in-stock products. Picked = these products in order; price, MRP and
// name always come live from the product, and each slot may swap in a
// custom photo. Out-of-stock picks, and picks with no photo at all, are
// skipped in the app.
import { ProductPinPicker } from '@/components/home/ProductPinPicker';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import { ITEM_FACTS, imageSlotsFor, type ItemConfig, type ItemId } from '@/lib/home/todayGrid';
import type { Product } from '@/lib/types';

type Images = ItemConfig['images'];
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function PhotoSlotsEditor({ id, images, products, onChange }: { id: ItemId; images: Images; products: Product[]; onChange: (next: Images) => void }) {
  const slots = imageSlotsFor(id);
  const hero = ITEM_FACTS[id].type === 'hero';
  const picked = images.mode === 'picked' ? images.productIds : [];
  const photos = images.mode === 'picked' ? images.photos ?? {} : {};
  const byId = new Map(products.map((p) => [p.id, p]));
  const pick = (productIds: string[], nextPhotos = photos) => {
    const kept = Object.fromEntries(Object.entries(nextPhotos).filter(([pid]) => productIds.includes(pid)));
    onChange({ mode: 'picked', productIds: productIds.slice(0, slots), ...(Object.keys(kept).length ? { photos: kept } : {}) });
  };
  const setPhoto = (pid: string, url: string | null) => {
    const next = { ...photos };
    if (url) next[pid] = url; else delete next[pid];
    pick(picked, next);
  };

  return (
    <div>
      <p className="text-xs font-medium text-muted">Photos · {slots} slot{slots === 1 ? '' : 's'}</p>
      <p className="mb-2 text-[11px] text-muted">
        {hero ? 'The big card rotates through these products: each shows its photo, store price, MRP (only when higher) and name.' : 'This card shows 2 product photos.'}
      </p>
      <div className="flex gap-4 text-xs">
        <label className="flex items-center gap-1"><input type="radio" checked={images.mode === 'auto'} onChange={() => onChange({ mode: 'auto' })} />Automatic (top {slots} in-stock)</label>
        <label className="flex items-center gap-1"><input type="radio" checked={images.mode === 'picked'} onChange={() => pick([])} />Pick products (up to {slots})</label>
      </div>
      {images.mode === 'picked' && (
        <div className="mt-2 flex flex-col gap-2">
          <ProductPinPicker productIds={picked} products={products} capacity={slots} onChange={(ids) => pick(ids)} />
          {picked.length > 0 && <p className="text-[11px] text-muted">Price, MRP and name come from the product and update automatically. Upload a custom photo per slot if you like.</p>}
          {picked.map((pid, index) => {
            const product = byId.get(pid);
            const custom = photos[pid];
            const photo = custom || product?.imageUrl;
            const mrp = product?.originalPrice != null && product.originalPrice > product.price ? product.originalPrice : null;
            return (
              <div key={pid} className="flex items-center gap-3 rounded-xl border border-border p-2 text-xs">
                <span className="w-4 text-center font-semibold text-muted">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{product?.name ?? 'Product not in the list (removed?)'}</p>
                  {product && <p className="text-muted">{rupees(product.price)}{mrp != null && <s className="ml-1.5">{rupees(mrp)}</s>} · {product.storeName}</p>}
                  {!photo && <p className="text-danger">No photo: upload one, or this slot is skipped.</p>}
                </div>
                <ProductImageUpload key={custom ?? 'product'} imageUrl={photo || undefined} bucket="appsui" small onChange={(url) => setPhoto(pid, url || null)} />
                {custom && <button type="button" onClick={() => setPhoto(pid, null)} className="rounded-lg border border-border px-2 py-1 text-[11px] text-ink">Use product photo</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
