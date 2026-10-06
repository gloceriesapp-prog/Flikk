'use client';

// Server upload routes public images to the corresponding R2 folder.
// The hosted URL is saved on the product, store or content record.

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';

export function ProductImageUpload({
  imageUrl,
  onChange,
  bucket = 'product-images',
}: {
  imageUrl: string | undefined;
  onChange: (url: string, bgColor: string | null) => void;
  bucket?: 'appsui' | 'banners' | 'categories' | 'festivals' | 'illustrations' | 'products' | 'stores' | 'product-images' | 'store-images' | 'category-images' | 'home-tab-images' | 'home-tab-banner-images';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
        disabled={uploading}
        aria-label="Upload image"
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
