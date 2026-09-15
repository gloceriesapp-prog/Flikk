'use client';

import { useState } from 'react';
import type { PartnerProduct, ProductInput } from '@/lib/partnerApi';
import { uploadProductPhoto } from '@/lib/partnerApi';

interface Props {
  initial?: PartnerProduct;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [originalPrice, setOriginalPrice] = useState(String(initial?.original_price ?? ''));
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [isInStock, setIsInStock] = useState(initial?.is_in_stock ?? true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        category,
        price: Number(price),
        original_price: originalPrice ? Number(originalPrice) : undefined,
        image_url: imageUrl || undefined,
        is_in_stock: isInStock,
      });
    } catch {
      setError('Could not save the product.');
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
        <Field label="Price (₹)">
          <input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
        </Field>
        <Field label="Original price (₹, optional)">
          <input type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="Photo">
        <div className="flex items-center gap-3">
          {imageUrl && <img src={imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={isUploading} className="text-sm text-neutral-500" />
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={isInStock} onChange={(e) => setIsInStock(e.target.checked)} />
        In stock
      </label>

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
