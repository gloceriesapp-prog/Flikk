'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PartnerProduct, ProductInput, StockStatus, UnitType, VariantInput } from '@/lib/partnerApi';
import { deriveStockStatus, uploadProductPhoto } from '@/lib/partnerApi';
import { formatVariantSize } from '@/lib/format';

interface Props {
  initial?: PartnerProduct;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

const UNIT_TYPES: UnitType[] = ['g', 'kg', 'ml', 'l', 'pc'];
// Derived-status readout for the total of every size's pack count — label +
// dot color per state. Status is computed from the counts (deriveStockStatus),
// never picked by hand, so the number and the label can't disagree.
const STATUS_DISPLAY: Record<StockStatus, { label: string; text: string; dot: string }> = {
  in_stock: { label: 'In stock', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  low_stock: { label: 'Low stock', text: 'text-amber-500', dot: 'bg-amber-400' },
  out_of_stock: { label: 'Out of stock', text: 'text-red-600', dot: 'bg-red-500' },
};

// One row of the variants editor — a local key so React can key/remove
// rows before they have a real identity, plus the real pack id when the row
// was loaded (sent so the backend edits that pack in place, keeping its
// stock); string inputs so an emptied field doesn't collapse to a stray "0".
interface VariantRow {
  key: string;
  id?: string;
  unitType: UnitType;
  quantity: string;
  price: string;
  originalPrice: string;
  stock: string;
}

let variantRowSeq = 0;
function newVariantRow(seed?: Partial<VariantRow>): VariantRow {
  return { key: `row-${++variantRowSeq}`, unitType: 'kg', quantity: '', price: '', originalPrice: '', stock: '', ...seed };
}

function parseStock(value: string): number | null {
  const count = Number(value);
  return value !== '' && Number.isInteger(count) && count >= 0 ? count : null;
}

function variantRowsFromProduct(product?: PartnerProduct): VariantRow[] {
  if (!product?.product_variants.length) return [newVariantRow()];
  return [...product.product_variants]
    .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : 0))
    .map((v, _index, all) => {
      // A single uncounted pack was tracked at product level before per-pack
      // counts existed — prefill that count rather than an empty field.
      const count = v.stock_quantity ?? (all.length === 1 ? product.stock_quantity : null);
      return newVariantRow({
        id: v.id,
        unitType: v.unit_type,
        quantity: String(v.quantity),
        price: String(v.price),
        originalPrice: v.original_price != null ? String(v.original_price) : '',
        stock: count != null ? String(count) : '',
      });
    });
}

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [isVeg, setIsVeg] = useState(initial?.is_veg ?? true);
  const [variants, setVariants] = useState<VariantRow[]>(() => variantRowsFromProduct(initial));
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, newVariantRow()]);
  }

  function removeVariant(key: string) {
    setVariants((prev) => (prev.length > 1 ? prev.filter((v) => v.key !== key) : prev));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadProductPhoto(base64);
      setImageUrl(url);
    } catch {
      setError('Photo upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedVariants: VariantInput[] = [];
    for (const v of variants) {
      const quantity = Number(v.quantity);
      const price = Number(v.price);
      if (!v.quantity || !Number.isFinite(quantity) || quantity <= 0) {
        setError(`Enter a valid size quantity for the ${v.unitType} row.`);
        return;
      }
      if (!v.price || !Number.isFinite(price) || price < 0) {
        setError(`Enter a valid price for the ${quantity} ${v.unitType} size.`);
        return;
      }
      const stock = parseStock(v.stock);
      if (stock == null) {
        setError(`Enter the packs in stock for the ${quantity} ${v.unitType} size as a whole number (0 or more).`);
        return;
      }
      parsedVariants.push({
        id: v.id,
        unitType: v.unitType,
        quantity,
        price,
        originalPrice: v.originalPrice ? Number(v.originalPrice) : undefined,
        stockQuantity: stock,
      });
    }
    const totalStock = parsedVariants.reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0);

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        category,
        stockStatus: deriveStockStatus(totalStock),
        imageUrl: imageUrl || undefined,
        isVeg,
        variants: parsedVariants,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </Field>
      <Field label="Category">
        <input required value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Stock (all sizes)">
          {(() => {
            const counts = variants.map((v) => parseStock(v.stock));
            if (counts.some((c) => c == null)) {
              return <span className="flex h-[42px] items-center text-xs text-neutral-400">Enter packs in stock for each size below.</span>;
            }
            const total = counts.reduce<number>((sum, c) => sum + (c ?? 0), 0);
            const status = STATUS_DISPLAY[deriveStockStatus(total)];
            return (
              <span className={`flex h-[42px] items-center gap-1.5 text-sm font-semibold ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {total} packs · {status.label}
              </span>
            );
          })()}
        </Field>
        <Field label="Veg / non-veg">
          <div className="flex h-[42px] items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input type="radio" checked={isVeg} onChange={() => setIsVeg(true)} /> Veg
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input type="radio" checked={!isVeg} onChange={() => setIsVeg(false)} /> Non-veg
            </label>
          </div>
        </Field>
      </div>

      <Field label="Photo">
        <div className="flex items-center gap-3">
          {imageUrl && <img src={imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={isUploading} className="text-sm text-neutral-500" />
        </div>
      </Field>

      {/* A photo the owner already submitted for this approved product that
          admin hasn't approved yet — the LIVE image (image_url, shown above)
          is unchanged until they do. Only rendered when editing an existing
          product that has one queued. When both exist we label them so the
          owner can tell the current live photo from the one in review. */}
      {initial?.pending_image_url && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          {initial.image_url && (
            <div className="flex flex-col items-center gap-1">
              <img src={initial.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <span className="text-[11px] font-medium text-neutral-500">Current</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <img src={initial.pending_image_url} alt="" className="h-14 w-14 rounded-lg border border-amber-300 object-cover" />
            <span className="text-[11px] font-medium text-amber-600">In review</span>
          </div>
          <p className="text-xs font-medium text-amber-600">Awaiting admin approval — your live photo stays until it&apos;s approved.</p>
        </div>
      )}

      {/* Name/price edits to a live product (migration 115) wait for admin;
          the form shows the live values customers currently see. */}
      {initial?.pending_changes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
          <p>Your last name or price change is awaiting admin approval — customers see the current values until it&apos;s approved.</p>
          {initial.pending_changes.name && <p className="mt-1">New name: {initial.pending_changes.name}</p>}
          {initial.pending_changes.variants && (
            <p className="mt-1">
              New prices:{' '}
              {initial.pending_changes.variants.map((v) => `${formatVariantSize(Number(v.quantity), v.unit_type)} ₹${v.price}`).join(' · ')}
            </p>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">
            Sizes <span className="text-neutral-400">— every weight/pack this product comes in, one product</span>
          </p>
          <button type="button" onClick={addVariant} className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Plus size={14} /> Add size
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {variants.map((v) => (
            <div key={v.key} className="grid grid-cols-[0.9fr_1fr_1fr_1fr_1fr_28px] items-center gap-2">
              <select
                value={v.unitType}
                onChange={(e) => updateVariant(v.key, { unitType: e.target.value as UnitType })}
                className="input"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Qty"
                value={v.quantity}
                onChange={(e) => updateVariant(v.key, { quantity: e.target.value })}
                className="input"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price ₹"
                value={v.price}
                onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                className="input"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="MRP ₹ (optional)"
                value={v.originalPrice}
                onChange={(e) => updateVariant(v.key, { originalPrice: e.target.value })}
                className="input"
              />
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="Packs in stock"
                value={v.stock}
                onChange={(e) => updateVariant(v.key, { stock: e.target.value })}
                className="input"
              />
              <button
                type="button"
                onClick={() => removeVariant(v.key)}
                disabled={variants.length === 1}
                className="flex h-full items-center justify-center text-neutral-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
