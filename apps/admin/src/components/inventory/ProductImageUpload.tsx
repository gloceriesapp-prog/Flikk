'use client';

// Server upload routes public images to the corresponding R2 folder.
// The hosted URL is saved on the product, store or content record.

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from '@/components/icons';
import { uploadPhoto, originalProductPhoto, type UploadedPhoto } from '@/lib/productPhotoUpload';

export function ProductImageUpload({
  imageUrl,
  onChange,
  bucket = 'product-images',
  small = false,
  onUploadingChange,
  badge,
  preserveOriginal = false,
  onPhotoUploaded,
}: {
  preserveOriginal?: boolean;
  onPhotoUploaded?: (photo: UploadedPhoto) => void;
  imageUrl: string | undefined;
  onChange: (url: string, bgColor: string | null) => void | Promise<void>;
  small?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  // Shown over the photo (cut-out status, components/inventory/usePhotoStatus).
  badge?: React.ReactNode;
  bucket?: 'appsui' | 'banners' | 'categories' | 'festivals' | 'illustrations' | 'products' | 'stores' | 'product-images' | 'store-images' | 'category-images' | 'home-tab-images' | 'home-tab-banner-images';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Product photos: the upload route warns when the product itself is small.
  const [warning, setWarning] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setWarning(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const uploadedPhoto = await uploadPhoto(file, bucket);
      onPhotoUploaded?.(uploadedPhoto);
      const photo = preserveOriginal ? originalProductPhoto(uploadedPhoto) : uploadedPhoto;
      setWarning(photo.warning ?? null);
      setUploaded(true);
      await onChange(photo.url, photo.bgColor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setPreview(null);
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  const displayUrl = preview ?? imageUrl;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative ${small ? 'h-20 w-20' : 'h-28 w-28'} overflow-hidden rounded-2xl border border-border bg-accent transition hover:border-ink/20`}
        disabled={uploading}
        aria-label="Upload image"
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full bg-[#F9FAFB] object-contain" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus size={20} />
            <span className="text-[10px] font-medium">Add photo</span>
          </span>
        )}
        {!preview && badge}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 size={20} className="animate-spin text-white" />
          </span>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </button>
      {error && <p className={`mt-1 ${small ? 'w-20' : 'w-28'} text-[10px] font-medium text-danger`}>{error}</p>}
      {warning && !error && <p className={`mt-1 ${small ? 'w-20' : 'w-28'} text-[10px] font-medium text-amber-600`}>{warning}</p>}
      {/* Product photos are cut out and centred by the photo worker after the product is saved. */}
      {uploaded && !error && !small && !preserveOriginal && ['products', 'product-images'].includes(bucket) && (
        <p className="mt-1 w-28 text-[10px] text-muted">Background is removed automatically a few seconds after you save.</p>
      )}
    </div>
  );
}
