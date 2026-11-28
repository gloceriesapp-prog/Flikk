'use client';

// Header artwork across the top of the Home grid block. Stored as the App
// content image key home.todayGrid.headerImageUrl (same store and appsui
// upload folder as other Home artwork); blank = the built-in artwork.
import { useEffect, useState } from 'react';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import { toast } from '@/components/ui/Toast';

export const HEADER_IMAGE_KEY = 'home.todayGrid.headerImageUrl';
export const DEFAULT_HEADER_IMAGE = 'https://images.gloceries.com/appsui/Namma.png';
type AppContent = { copy: Record<string, string> } & Record<string, unknown>;

export function HeaderImageCard() {
  const [content, setContent] = useState<AppContent | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch('/api/app-content').then((r) => (r.ok ? r.json() : null)).then(setContent, () => setContent(null)); }, []);
  const current = content?.copy?.[HEADER_IMAGE_KEY]?.trim() || '';

  async function save(url: string) {
    if (!content) return;
    setSaving(true);
    try {
      const copy = { ...content.copy };
      if (url) copy[HEADER_IMAGE_KEY] = url; else delete copy[HEADER_IMAGE_KEY];
      const res = await fetch('/api/app-content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...content, copy }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Save failed.');
      setContent(body); toast.success(url ? 'Header image saved. Live on Home now.' : 'Back to the built-in header image.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="card flex flex-wrap items-start gap-4 p-4">
      <div className="min-w-[220px] flex-1">
        <p className="text-sm font-semibold text-ink">Header image</p>
        <p className="mt-0.5 text-xs text-muted">Across the top of the grid on Home. Wide 3:1, e.g. 1200×400 px, PNG/WebP under 5 MB. Saves straight to the app (not part of the draft).</p>
        <div className="mt-3 flex items-center gap-2">
          {content ? <ProductImageUpload key={current} imageUrl={current || undefined} bucket="appsui" onChange={(url) => save(url)} small /> : <span className="text-xs text-muted">Loading…</span>}
          {current && <button type="button" disabled={saving} onClick={() => void save('')} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-40">Use built-in image</button>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[360, 430].map((w) => (
          <div key={w}>
            <p className="text-[10px] text-muted">{w} px phone</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- R2 artwork URL, preview only */}
            <img src={current || DEFAULT_HEADER_IMAGE} alt="" style={{ width: w * 0.6, borderRadius: 12, background: '#D0E0FD' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
