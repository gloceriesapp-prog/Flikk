'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/components/icons';
import { cropProductPhoto, DEFAULT_PHOTO_CROP, productPhotoCropRect, type PhotoCrop } from '@/lib/productPhotoCrop';

function CropPreview({ file, crop, onChange, onReady }: {
  file: File; crop: PhotoCrop; onChange: (crop: PhotoCrop) => void; onReady: (ready: boolean) => void;
}) {
  const [photo, setPhoto] = useState<{ url: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (!active) return;
      setPhoto({ url, width: image.naturalWidth, height: image.naturalHeight });
      onReady(true);
    };
    image.onerror = () => { if (active) { setError('Could not open this photo. Choose a JPG, PNG or WebP image.'); onReady(false); } };
    image.src = url;
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [file, onReady]);
  const rect = photo && productPhotoCropRect(photo.width, photo.height, crop);
  const fill = crop.mode === 'fill';
  return <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
    <div>
      <div className="relative mx-auto aspect-[8/9] w-full max-w-60" aria-label="Product card crop preview">
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-[#F9FAFB]">
        {photo && <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Selected product photo" draggable={false}
            className={fill ? 'absolute max-w-none' : 'h-full w-full object-contain'}
            style={fill && rect ? { width: `${photo.width / rect.width * 100}%`, height: `${photo.height / rect.height * 100}%`, left: `${-rect.x / rect.width * 100}%`, top: `${-rect.y / rect.height * 100}%` } : undefined} />
        </>}
        {!photo && <span role="status" className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">{error ?? 'Opening photo…'}</span>}
        </div>
        {photo && <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-[28%] aspect-square items-center justify-center rounded-full border-[3px] border-white bg-[#155DFC] text-white"><span className="relative h-6 w-6 before:absolute before:left-0 before:top-[11px] before:h-0.5 before:w-6 before:rounded-full before:bg-white after:absolute after:left-[11px] after:top-0 after:h-6 after:w-0.5 after:rounded-full after:bg-white" /></span>}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">Blue button shown for placement only</p>
    </div>
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2 font-semibold">Photo fit</legend>
        <label className="flex items-center gap-2"><input type="radio" name="photo-fit" checked={fill} onChange={() => onChange({ ...crop, mode: 'fill' })} />Fill card · 8:9</label>
        <label className="flex items-center gap-2"><input type="radio" name="photo-fit" checked={!fill} onChange={() => onChange({ ...crop, mode: 'original' })} />Keep full original</label>
      </fieldset>
      {fill ? <>
        <p className="text-xs text-muted">Adjust the crop to keep the product centred and clear of the blue button.</p>
        {([['x', 'Horizontal position', 0, 100, 1], ['y', 'Vertical position', 0, 100, 1], ['zoom', 'Zoom', 1, 3, 0.01]] as const).map(([key, label, min, max, step]) => <label key={key} className="flex flex-col gap-2 text-xs font-medium">
          {label}
          <input type="range" aria-label={label} min={min} max={max} step={step} value={crop[key]} disabled={!photo} onChange={event => onChange({ ...crop, [key]: Number(event.target.value) })} className="w-full accent-[#155DFC]" />
        </label>)}
        <button type="button" className="self-start text-xs font-medium text-brand" onClick={() => onChange({ ...DEFAULT_PHOTO_CROP })}>Reset crop</button>
        <p className="text-[11px] text-muted">Output: 1440 × 1620 px. Small photos may look softer when enlarged.</p>
      </> : <p className="text-xs text-muted">Keeps the whole image. Photos with a different ratio may show space around them in the card.</p>}
    </div>
  </div>;
}

export function ProductPhotoCropDialog({ files, onComplete }: { files: File[]; onComplete: (files: File[] | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [index, setIndex] = useState(0);
  const [crops, setCrops] = useState(() => files.map(() => ({ ...DEFAULT_PHOTO_CROP })));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
    return () => { controller.current?.abort(); };
  }, []);

  function navigate(next: number) { setReady(false); setIndex(next); setError(null); }
  async function confirm() {
    setBusy(true); setError(null);
    const abort = new AbortController(); controller.current = abort;
    try {
      const prepared: File[] = [];
      // Decode/export sequentially to bound memory and preserve selection order.
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        prepared.push(await cropProductPhoto(files[i]!, crops[i]!, abort.signal));
      }
      onComplete(prepared);
    } catch (failure) {
      if (!abort.signal.aborted) { setError(failure instanceof Error ? failure.message : 'Could not prepare photos.'); setBusy(false); }
    }
  }
  return createPortal(<dialog ref={dialog} aria-labelledby="product-photo-crop-title"
    className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-3xl bg-white p-0 text-ink shadow-xl backdrop:bg-black/50"
    onClick={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); onComplete(null); }}>
    <div className="flex max-h-[92dvh] flex-col">
    <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
      <div><h3 id="product-photo-crop-title" className="text-lg font-semibold">Fit product photos</h3><p className="mt-1 text-xs text-muted">Photo {index + 1} of {files.length} · {files[index]!.name}</p></div>
      <button type="button" aria-label="Cancel photo crop" onClick={() => onComplete(null)} className="p-2 text-muted"><X size={18} /></button>
    </div>
    <div className="min-h-0 overflow-y-auto px-5">
    <fieldset disabled={busy}>
      <CropPreview key={index} file={files[index]!} crop={crops[index]!} onReady={setReady}
        onChange={crop => setCrops(previous => previous.map((value, i) => i === index ? crop : value))} />
    </fieldset>
    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
    <p className="mt-4 text-xs text-muted">Cropping changes the framing only. Your selected image style is applied after upload. To keep a scene or background, choose None.</p>
    </div>
    <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-border p-5">
      <button type="button" onClick={() => onComplete(null)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
      <div className="flex gap-2">
        {index > 0 && <button type="button" disabled={busy} onClick={() => navigate(index - 1)} className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">Previous</button>}
        {index < files.length - 1 ? <button type="button" disabled={busy || !ready} onClick={() => navigate(index + 1)} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Next photo</button>
          : <button type="button" disabled={busy || !ready} onClick={() => void confirm()} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? `Preparing ${progress}/${files.length}…` : `Use ${files.length === 1 ? 'photo' : `${files.length} photos`}`}</button>}
      </div>
    </div>
    </div>
  </dialog>, document.body);
}
