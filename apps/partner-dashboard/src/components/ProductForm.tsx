'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PartnerProduct, ProductInput, StockStatus, UnitType, VariantInput } from '@/lib/partnerApi';
import { uploadProductPhoto } from '@/lib/partnerApi';

interface Props {
  initial?: PartnerProduct;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

const UNIT_TYPES: UnitType[] = ['g', 'kg', 'ml', 'l', 'pc'];
const STOCK_STATUSES: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

// One row of the variants editor — a local id (not sent to the backend)
// so React can key/remove rows before they have a real identity; string
// inputs so an emptied field doesn't collapse to a stray "0" mid-edit.
interface VariantRow {
  key: string;
  unitType: UnitType;
  quantity: string;
  price: string;
  originalPrice: string;
}

let variantRowSeq = 0;
function newVariantRow(seed?: Partial<VariantRow>): VariantRow {
  return { key: `row-${++variantRowSeq}`, unitType: 'kg', quantity: '', price: '', originalPrice: '', ...seed };
}

function variantRowsFromProduct(product?: PartnerProduct): VariantRow[] {
  if (!product?.product_variants.length) return [newVariantRow()];
  return [...product.product_variants]
    .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : 0))
    .map((v) =>
      newVariantRow({
        unitType: v.unit_type,
        quantity: String(v.quantity),
        price: String(v.price),
        originalPrice: v.original_price != null ? String(v.original_price) : '',
      }),
    );
}

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [isVeg, setIsVeg] = useState(initial?.is_veg ?? true);
  const [stockStatus, setStockStatus] = useState<StockStatus>(initial?.stock_status ?? 'in_stock');
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
      parsedVariants.push({
        unitType: v.unitType,
        quantity,
        price,
        originalPrice: v.originalPrice ? Number(v.originalPrice) : undefined,
      });
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        category,
        stockStatus,
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
        <Field label="Stock status">
          <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value as StockStatus)} className="input">
            {STOCK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
            <div key={v.key} className="grid grid-cols-[0.9fr_1fr_1fr_1fr_28px] items-center gap-2">
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
