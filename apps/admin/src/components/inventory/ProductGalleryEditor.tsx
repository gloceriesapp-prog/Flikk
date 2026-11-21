'use client';

// Extra product photos after the main one (products.extra_image_urls). The
// main photo stays in ProductImageUpload next to the name; these follow it in
// the customer app's swipeable gallery, in the order shown here. Several
// photos can be picked at once; they upload one by one and each is then cut
// out like the main photo (workers/image-cutout) after the product is saved.

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from '@/components/icons';
import { MAX_EXTRA_IMAGES } from '@/lib/productValidation';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadMany(files: File[]) {
    const room = MAX_EXTRA_IMAGES - urls.length;
    const picked = files.slice(0, room);
    setError(files.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit; the rest were skipped.` : null);
    if (!picked.length) return;
    onUploadingChange?.(true);
    // urls in this closure is the list before the batch: add to a local copy.
    const next = [...urls];
    const failed: string[] = [];
    try {
      for (const [index, file] of picked.entries()) {
        setProgress({ done: index, total: picked.length });
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('bucket', 'product-images');
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error ?? 'Upload failed.');
          const url = body.url as string;
          if (onUpload) onUpload(url);
          else if (!next.includes(url)) { next.push(url); onChange([...next]); }
        } catch (err) {
          failed.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed.'}`);
        }
      }
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
      if (failed.length) setError(failed.join(' '));
    }
  }

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
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={!!progress}
              className="relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-accent text-muted transition hover:border-ink/20"
              aria-label="Add photos"
            >
              {progress ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-[10px] font-medium">{progress.done + 1} of {progress.total}</span>
                </>
              ) : (
                <>
                  <ImagePlus size={20} />
                  <span className="text-[10px] font-medium">Add photos</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = '';
                  void uploadMany(files);
                }}
              />
            </button>
          ) : (
            <p className="self-center text-[11px] text-muted">Add the main photo first.</p>
          )
        )}
      </div>
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
      {urls.length > 0 && <p className="text-[11px] text-muted">You can pick several photos at once. Backgrounds are removed a few seconds after you save.</p>}
    </div>
  );
}
