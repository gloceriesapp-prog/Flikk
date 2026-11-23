'use client';

// Edit surface for one product — every field a founder can eyeball on the
// card is editable here, including the real product photo
// (ProductImageUpload) and the full per-size variant list. onSave is
// async — InventoryPage PATCHes /api/products/[id] (service-role write,
// see that route's own note) and refetches the live list; this modal just
// shows a submitting state and surfaces whatever error comes back.

import { useCallback, useState } from 'react';
import { X } from '@/components/icons';
import type { Product, StockStatus } from '@/lib/types';
import { FRESHNESS_TAG_PRESETS } from '@/lib/mock-data';
import type { StoreOption } from '@/lib/supabase/products';
import { VegChoice } from './VegChoice';
import { BrandPicker } from './BrandPicker';
import { CataloguePicker, type CataloguePlacement } from './CataloguePicker';
import { formatVariantUnit, sellingPrice, validateProductInput } from '@/lib/productValidation';
import { ProductGalleryEditor } from './ProductGalleryEditor';
import { PhotoStatusBadge, usePhotoStatus } from './usePhotoStatus';
import { PremiumImagePanel } from './PremiumImagePanel';
import type { PresetId } from '@/lib/photoroomPresets';
import { appendProductPhotos, swapFirstGalleryPhoto } from '@/lib/productPhotoUpload';
import { ChickenOptionsEditor } from './ChickenOptionsEditor';
import { ProductVariantsEditor, emptyVariant } from './ProductVariantsEditor';
import { ProductFlavoursEditor } from './ProductFlavoursEditor';
import { ServingOptionsEditor } from './ServingOptionsEditor';
import { PreorderEditor } from './PreorderEditor';
import { HomeSectionChecklist, useHomeSectionChoice } from '@/components/home/HomeSectionChecklist';
import { createPortal } from 'react-dom';

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function EditProductModal({
  product,
  stores,
  onClose,
  onSave,
  premiumStart,
}: {
  product: Product;
  // From Add product with Premium picked: open the Premium step on that background.
  premiumStart?: { preset: PresetId; color: string | null };
  stores: StoreOption[];
  onClose: () => void;
  // homeKeys: the Home sections to pick it in, or null when unchanged.
  onSave: (updated: Product, homeKeys: string[] | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Product>({
    ...product,
    variants: product.variants.length > 0 ? product.variants : [emptyVariant()],
  });
  const setPlacement = useCallback((placement: CataloguePlacement) => setDraft((d) => ({ ...d, ...placement })), []);
  const [error, setError] = useState<string | null>(null);
  // Cut-out status of the saved photos; a cleaned version replaces the old
  // photo in the form as soon as it is ready.
  const photoStates = usePhotoStatus(product.id, [draft.imageUrl, ...(draft.extraImageUrls ?? [])].filter((u): u is string => !!u),
    (from, to) => setDraft((current) => ({
      ...current,
      imageUrl: current.imageUrl === from ? to : current.imageUrl,
      extraImageUrls: (current.extraImageUrls ?? []).map((url) => (url === from ? to : url)),
    })));
  const [submitting, setSubmitting] = useState(false);
  const [flavourUploading, setFlavourUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const photosUploading = flavourUploading || galleryUploading;
  const homeChoice = useHomeSectionChoice(product.id, !product.quickTabKey);

  async function handleSave() {
    if (photosUploading || submitting) return;
    const defaultVariant = draft.variants[0];
    if (!defaultVariant) return;
    // Same rule as Add: every size needs a counted stock to be orderable.
    if (!product.quickTabKey && !draft.subCategoryId) {
      setError('Pick where this product is listed (Category › Sub-category).');
      return;
    }
    if (draft.variants.some((v) => v.stockQuantity == null)) {
      setError('Enter packs in stock for every size (0 if none).');
      return;
    }

    try {
      validateProductInput(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check the product details.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        // Kept in sync with variants[0] — see lib/productValidation.ts
        // toProductRow, which the API route recomputes server-side anyway.
        price: sellingPrice(defaultVariant.price, defaultVariant.originalPrice),
        originalPrice: defaultVariant.originalPrice,
        unit: formatVariantUnit(defaultVariant),
        // Sent as null when cleared, so the API removes the brand.
        brandId: draft.brandId ?? null,
      }, homeChoice.changedKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes — try again.');
      setSubmitting(false);
    }
  }

  // Portalled to <body> so the overlay covers the whole screen, not just the
  // transformed page area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Edit product</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <PremiumImagePanel
            productId={product.id}
            imageUrl={draft.imageUrl}
            start={premiumStart}
            onApplied={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))}
          />

          <ProductGalleryEditor
            coverUrl={draft.imageUrl}
            coverFields={
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={FIELD_CLASS}
                placeholder="Product name"
                aria-label="Product name"
              />
            }
            urls={draft.extraImageUrls ?? []}
            hasCover={Boolean(draft.imageUrl)}
            onChange={(extraImageUrls) => setDraft((current) => ({ ...current, extraImageUrls }))}
            onSwapCover={() => setDraft((current) => {
              const photos = swapFirstGalleryPhoto(current);
              return photos ? { ...current, ...photos, bgColor: undefined } : current;
            })}
            onUpload={(photos, replaceCover) => setDraft((current) => ({ ...current, ...appendProductPhotos(current, photos, replaceCover) }))}
            onUploadingChange={setGalleryUploading}
            statusBadge={(url) => <PhotoStatusBadge state={photoStates.get(url)} />}
          />

          <input
            value={draft.localName ?? ''}
            onChange={(e) => setDraft({ ...draft, localName: e.target.value || undefined })}
            className={FIELD_CLASS}
            placeholder="Local name (e.g. Eerulli) — optional"
            aria-label="Local name"
          />

          {product.quickTabKey ? (
            <label className="grid gap-1 text-sm font-medium">
              Quick category
              <input className={FIELD_CLASS} value={draft.category} readOnly />
            </label>
          ) : <CataloguePicker subCategoryId={draft.subCategoryId} legacyCategory={draft.subCategoryId ? undefined : draft.category} onChange={setPlacement} />}

          <BrandPicker brandId={draft.brandId} onChange={(brandId) => setDraft((d) => ({ ...d, brandId }))} />

          <ChickenOptionsEditor
            category={draft.category}
            enabled={draft.cutOptionsEnabled ?? false}
            bulkMinKg={draft.bulkMinKg ?? null}
            onChange={(next) => setDraft({ ...draft, ...next })}
          />

          <textarea
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            className={`${FIELD_CLASS} min-h-[72px] resize-none`}
            placeholder="Description — optional"
            aria-label="Description"
          />

          <select
            value={draft.storeId}
            onChange={(e) => {
              const store = stores.find((s) => s.id === e.target.value);
              if (!store) return;
              setDraft({ ...draft, storeId: store.id, storeName: store.name });
            }}
            className={FIELD_CLASS}
            aria-label="Store"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.district}
              </option>
            ))}
          </select>

          <ProductVariantsEditor category={draft.category} variants={draft.variants} onChange={(variants) => setDraft({ ...draft, variants })} />

          <ProductFlavoursEditor variants={draft.variants} options={draft.options ?? []} onChange={(options) => setDraft((current) => ({ ...current, options }))} onBusyChange={setFlavourUploading} />

          <ServingOptionsEditor value={draft.servingOptions ?? []} onChange={(servingOptions) => setDraft({ ...draft, servingOptions })} />
          {!product.quickTabKey && <PreorderEditor value={draft} onChange={(preorder) => setDraft({ ...draft, ...preorder })} variants={draft.variants} onVariantsChange={(variants) => setDraft({ ...draft, variants })} />}

          {(draft.variants.some((v) => (v.platformMarkup ?? 0) > 0) || draft.waiveCommission) && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.waiveCommission ?? false}
                onChange={(e) => setDraft({ ...draft, waiveCommission: e.target.checked })}
              />
              No commission from the store on this product (we earn only our extra)
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.showUnitPrice ?? false}
              onChange={(e) => setDraft({ ...draft, showUnitPrice: e.target.checked })}
            />
            Show price per kg / L / piece on the card (e.g. ₹63.6/kg)
          </label>

          {/* Same field the customer app's ProductCard reads. Optional for
              every category: left as "Not set", the product shows no
              veg/non-veg mark. */}
          <VegChoice value={draft.isVeg} onChange={(isVeg) => setDraft({ ...draft, isVeg })} />

          <select
            value={draft.freshnessTag ?? ''}
            onChange={(e) => setDraft({ ...draft, freshnessTag: e.target.value || undefined })}
            className={FIELD_CLASS}
            aria-label="Freshness tag"
          >
            <option value="">No freshness tag</option>
            {FRESHNESS_TAG_PRESETS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={draft.stockStatus}
            onChange={(e) => setDraft({ ...draft, stockStatus: e.target.value as StockStatus })}
            className={FIELD_CLASS}
            aria-label="Stock status"
          >
            {STOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {!product.quickTabKey && <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-ink">Show on Home</p>
              <p className="text-xs text-muted">Pick the Home sections this product should appear in. Reorder them on the &ldquo;All&rdquo; tab layout page.</p>
            </div>
            <HomeSectionChecklist choice={homeChoice} compact />
          </div>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || photosUploading}
            className="rounded-[10px] bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-brand-strong"
          >
            {photosUploading ? 'Uploading photos…' : submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
