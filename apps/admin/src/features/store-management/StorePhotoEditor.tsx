'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';

export function StorePhotoEditor({ url, disabled, onChange, onBusy }: {
  url: string; disabled: boolean; onChange: (url: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function upload(file?: File) {
    if (!file || busy) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP image under 5 MB.'); return;
    }
    setPreview(URL.createObjectURL(file)); setBusy(true); onBusy(true);
    const abort = new AbortController(); controller.current = abort;
    try {
      const form = new FormData(); form.append('file', file); form.append('bucket', 'store-images');
      const response = await fetch('/api/upload', { method: 'POST', body: form, signal: abort.signal });
      const body = await response.json();
      if (!response.ok || typeof body.url !== 'string') throw new Error(body.error ?? 'Photo upload failed.');
      if (!abort.signal.aborted) onChange(body.url);
    } catch (error) {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Could not upload photo.');
    } finally {
      if (!abort.signal.aborted) { setPreview(undefined); setBusy(false); onBusy(false); }
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-border bg-accent">
        {preview || url ? (
          // Store photos can come from Supabase or an administrator-provided URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview ?? url} alt="Store profile photo" className="h-full w-full object-cover" />
        ) : <Camera className="m-auto mt-10 text-muted" size={28} />}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="animate-spin text-white" /></div>}
      </div>
      <div>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold ${disabled || busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Camera size={16} />{busy ? 'Uploading…' : url ? 'Change photo' : 'Upload photo'}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy}
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
        </label>
        {url && <button type="button" disabled={disabled || busy} onClick={() => onChange('')} className="ml-3 inline-flex items-center gap-1 text-sm text-danger disabled:opacity-50"><Trash2 size={14} />Remove</button>}
        <p className="mt-2 text-xs text-muted">JPG, PNG or WebP · up to 5 MB. Save changes to publish.</p>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
