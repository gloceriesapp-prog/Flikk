'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, X } from '@/components/icons';
import { MAX_EXTRA_IMAGES } from '@/lib/productValidation';
import { uploadPhoto, originalProductPhoto, type UploadedPhoto } from '@/lib/productPhotoUpload';

export function ProductGalleryEditor({
  urls,
  hasCover,
  coverUrl,
  coverFields,
  onChange,
  onSwapCover,
  onUpload,
  onUploadingChange,
  statusBadge,
  preserveOriginal = false,
  onPhotoUploaded,
}: {
  preserveOriginal?: boolean;
  onPhotoUploaded?: (photo: UploadedPhoto) => void;
  urls: string[];
  hasCover: boolean;
  coverUrl?: string;
  coverFields?: ReactNode;
  statusBadge?: (url: string) => ReactNode;
  onChange: (urls: string[]) => void;
  onSwapCover: () => void;
  onUpload: (photos: UploadedPhoto[], replaceCover: boolean) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const replaceCoverOnPick = useRef(false);
  const inFlight = useRef(false);
  const [remaining, setRemaining] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const available = MAX_EXTRA_IMAGES - urls.length + (hasCover ? 0 : 1);

  function choosePhotos(replaceCover: boolean) {
    replaceCoverOnPick.current = replaceCover;
    input.current?.click();
  }

  async function uploadBatch(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (inFlight.current || !files.length) return;
    const replaceCover = replaceCoverOnPick.current;
    const capacity = available + Number(replaceCover && hasCover);
    if (files.length > capacity) {
      setErrors([`Choose up to ${capacity} photo${capacity === 1 ? '' : 's'}, or remove existing gallery photos to make room.`]);
      return;
    }

    inFlight.current = true;
    setErrors([]);
    setRemaining(files.length);
    onUploadingChange(true);
    const upload = async (file: File) => {
      const photo = await uploadPhoto(file, 'product-images');
      onPhotoUploaded?.(photo);
      return preserveOriginal ? originalProductPhoto(photo) : photo;
    };
    const photos: UploadedPhoto[] = [];
    const failures: string[] = [];
    try {
      const hasDesignatedCover = replaceCover || !hasCover;
      if (hasDesignatedCover) {
        const cover = files[0]!;
        try {
          photos.push(await upload(cover));
        } catch (error) {
          setErrors([`Main photo (${cover.name}) could not be uploaded. ${error instanceof Error ? error.message : 'Please try again.'}`]);
          return;
        }
        setRemaining(files.length - 1);
      }
      // The upload route processes at most two images at once. allSettled
      // returns results in file order even when the second one finishes first.
      for (let offset = Number(hasDesignatedCover); offset < files.length; offset += 2) {
        const group = files.slice(offset, offset + 2);
        const results = await Promise.allSettled(group.map((file) => upload(file)));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') photos.push(result.value);
          else {
            const error = result.reason;
            failures.push(`${group[index]!.name} · ${error instanceof Error ? error.message : 'Upload failed. Try again.'}`);
          }
        });
        setRemaining(files.length - offset - group.length);
      }
      if (photos.length) onUpload(photos, replaceCover);
      setErrors(failures);
    } finally {
      inFlight.current = false;
      setRemaining(0);
      onUploadingChange(false);
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
      {coverFields && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => choosePhotos(true)} disabled={remaining > 0}
            aria-label="Select main product image and gallery photos"
            className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border bg-accent text-muted disabled:opacity-60">
            {coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="h-full w-full bg-[#F9FAFB] object-contain" />
                {statusBadge?.(coverUrl)}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">1</span>
              </>
            ) : (
              <>
                <ImagePlus size={20} />
                <span className="text-[10px] font-medium">Product images</span>
              </>
            )}
          </button>
          {coverFields}
        </div>
      )}
      <p className="text-xs font-medium text-muted">
        Photos ({urls.length + Number(hasCover)}/{MAX_EXTRA_IMAGES + 1})
      </p>
      <p className="text-xs text-muted">
        {coverFields ? 'Select multiple files from the Product images tile. The first becomes the main image.' : hasCover ? 'Use the arrows to change the photo order.' : 'The first uploaded photo becomes the main image.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${index + 2}`} className="h-full w-full bg-[#F9FAFB] object-contain" />
            {statusBadge?.(url)}
            <span aria-hidden="true" className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{index + 2}</span>
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
                onClick={() => index === 0 ? onSwapCover() : move(index, index - 1)}
                disabled={index === 0 && !hasCover}
                className="rounded-full bg-black/60 p-0.5 text-white disabled:invisible"
                aria-label={index === 0 ? 'Make photo 2 the main photo' : `Move photo ${index + 2} earlier`}
                title={index === 0 ? 'Make main photo' : 'Move earlier'}
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
        {available > 0 && (
          <button type="button" onClick={() => choosePhotos(false)} disabled={remaining > 0}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-accent text-muted disabled:opacity-60">
            <ImagePlus size={20} />
            <span className="text-[10px] font-medium">Add photos</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp"
        aria-label="Choose product photos" onChange={uploadBatch} className="hidden" />
      {remaining > 0 && <p role="status" className="text-xs text-muted">Uploading photos · {remaining} remaining</p>}
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-danger">
          {errors.map((error, index) => <li key={index}>{error}</li>)}
        </ul>
      )}
    </div>
  );
}
