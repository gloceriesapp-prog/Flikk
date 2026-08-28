'use client';

// Real product/store photo upload — a founder picks an image file, it's
// uploaded to Supabase Storage (app/api/upload) and the resulting public
// URL is what gets stored on Product.imageUrl / Store.photoUrl. `bucket`
// picks which one — "product-images" (default) or "store-images" — see
// app/api/upload/route.ts's own note on why they're kept separate.
// Previously this read the file client-side into a base64
// data URL and stored THAT directly — for anything but a tiny image that
// bloats the row and every request touching it afterward, which is why
// uploads weren't reliably landing in the DB. Square preview box, click
// anywhere on it (or the file input it wraps) to pick/replace the photo —
// no separate "upload" button, the box itself is the control.
//
// Shows an immediate local preview (URL.createObjectURL) while the real
// upload is in flight, then swaps to the hosted URL once onChange fires —
// a founder sees their photo right away instead of a blank box during the
// round trip.
//
// The upload response also carries a pastel bg_color extracted from the
// photo (lib/bgColor.ts) — passed through as onChange's second argument.
// AddStoreModal ignores it (stores have no bg_color field); Add/EditProductModal
// store it on draft.bgColor.

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';

export function ProductImageUpload({
  imageUrl,
  onChange,
  bucket = 'product-images',
}: {
  imageUrl: string | undefined;
  onChange: (url: string, bgColor: string | null) => void;
  bucket?: 'product-images' | 'store-images' | 'category-images' | 'home-tab-images';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Upload failed.');
      onChange(body.url as string, (body.bgColor as string | null) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? imageUrl;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border bg-accent transition hover:border-ink/20"
        aria-label="Product photo"
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus size={20} />
            <span className="text-[10px] font-medium">Add photo</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 size={20} className="animate-spin text-white" />
          </span>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </button>
      {error && <p className="mt-1 w-28 text-[10px] font-medium text-danger">{error}</p>}
    </div>
  );
}
