'use client';

// Extra product photos after the main one (products.extra_image_urls). The
// main photo stays in ProductImageUpload next to the name; these follow it in
// the customer app's swipeable gallery, in the order shown here.

import { ChevronLeft, ChevronRight, X } from '@/components/icons';
import { MAX_EXTRA_IMAGES } from '@/lib/productValidation';
import { ProductImageUpload } from './ProductImageUpload';

export function ProductGalleryEditor({
  urls,
  hasCover,
  onChange,
  onUpload,
  onUploadingChange,
}: {
  urls: string[];
  hasCover: boolean;
  onChange: (urls: string[]) => void;
  onUpload?: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  function move(from: number, to: number) {
    const next = [...urls];
    const [url] = next.splice(from, 1);
    next.splice(to, 0, url!);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted">
        More photos ({urls.length}/{MAX_EXTRA_IMAGES}) — customers swipe through these after the main photo
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${index + 2}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              aria-label={`Remove photo ${index + 2}`}
            >
              <X size={12} />
            </button>
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="rounded-full bg-black/60 p-0.5 text-white disabled:invisible"
                aria-label={`Move photo ${index + 2} earlier`}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === urls.length - 1}
                className="rounded-full bg-black/60 p-0.5 text-white disabled:invisible"
                aria-label={`Move photo ${index + 2} later`}
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
        {urls.length < MAX_EXTRA_IMAGES && (
          hasCover ? (
            // Remounted per count so the tile resets to "Add photo" after each upload.
            <ProductImageUpload
              key={urls.length}
              small
              imageUrl={undefined}
              onUploadingChange={onUploadingChange}
              onChange={(url) => { if (onUpload) onUpload(url); else if (!urls.includes(url)) onChange([...urls, url]); }}
            />
          ) : (
            <p className="self-center text-[11px] text-muted">Add the main photo first.</p>
          )
        )}
      </div>
    </div>
  );
}
