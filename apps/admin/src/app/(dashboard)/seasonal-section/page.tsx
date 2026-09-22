'use client';

// Seasonal poster + tiles — real admin control over the customer app's
// Home "All" tab seasonal section (apps/customer/src/screens/home/
// seasonal/SeasonalSection.tsx via its own useSeasonalSection.ts). Was
// fully hardcoded before this (a data.ts file that only a code deploy
// could change) — now backed by public.seasonal_banner/seasonal_tiles via
// app/api/seasonal-section/*.
//
// Tile grid caps at 4 on the customer app (a fixed 2x2 layout) — this
// page doesn't hard-block a 5th tile, but only the first 4 active ones by
// sort order actually render there (backend's own GET route limits(4)).

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface Tile {
  id: string;
  title: string;
  imageUrl: string | null;
  bgColor: string;
  sortOrder: number;
  isActive: boolean;
}

interface Banner {
  id: string;
  bannerImageUrl: string | null;
  isActive: boolean;
}

const DEFAULT_BG = '#F4F1EA';

export default function SeasonalSectionPage() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [bannerDraft, setBannerDraft] = useState('');
  const [savingBanner, setSavingBanner] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', imageUrl: '', bgColor: DEFAULT_BG });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/seasonal-section');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load the seasonal section.');
      const body = await res.json();
      setBanner(body.banner);
      setBannerDraft(body.banner.bannerImageUrl ?? '');
      setTiles(body.tiles);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the seasonal section.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  async function handleSaveBanner() {
    if (!banner || savingBanner) return;
    setSavingBanner(true);
    try {
      const res = await fetch('/api/seasonal-section/banner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerImageUrl: bannerDraft, isActive: bannerDraft.trim().length > 0 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save the banner.');
      setBanner(body as Banner);
    } finally {
      setSavingBanner(false);
    }
  }

  async function handleCreateTile(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/seasonal-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sortOrder: tiles.length }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not add tile.');
      setTiles((prev) => [...prev, body as Tile]);
      setDraft({ title: '', imageUrl: '', bgColor: DEFAULT_BG });
      setAdding(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add tile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(tile: Tile) {
    const res = await fetch(`/api/seasonal-section/${tile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tile, isActive: !tile.isActive }),
    });
    const body = await res.json();
    if (res.ok) setTiles((prev) => prev.map((t) => (t.id === tile.id ? (body as Tile) : t)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/seasonal-section/${id}`, { method: 'DELETE' });
    if (res.ok) setTiles((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Seasonal Section</h1>
        <p className="text-sm text-muted">The poster and tile grid on the customer app&apos;s Home &quot;All&quot; tab.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-semibold text-ink">Poster banner</h3>
        <p className="mb-4 text-xs text-muted">Paste an image URL. Leave blank to turn the banner off entirely.</p>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              value={bannerDraft}
              onChange={(e) => setBannerDraft(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-ink/40"
            />
            {bannerDraft && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerDraft} alt="Banner preview" className="h-20 w-full rounded-2xl object-cover" />
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveBanner}
                disabled={savingBanner || bannerDraft === (banner?.bannerImageUrl ?? '')}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {savingBanner ? 'Saving…' : 'Save banner'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">Tiles</h3>
          <p className="text-sm text-muted">First 4 active tiles, by order, show on the customer app.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={15} />
          Add tile
        </button>
      </div>

      {adding && (
        <form onSubmit={handleCreateTile} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Title</span>
              <input
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Modak & Prasad"
                className="rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Image URL</span>
              <input
                value={draft.imageUrl}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                placeholder="https://…"
                className="rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Card color</span>
              <input
                type="color"
                value={draft.bgColor}
                onChange={(e) => setDraft({ ...draft, bgColor: e.target.value })}
                className="h-10 w-full rounded-xl border border-border"
              />
            </label>
          </div>
          {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setAdding(false)} className="text-sm font-medium text-muted">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? 'Adding…' : 'Add tile'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
            <div className="flex h-24 items-center justify-center rounded-2xl" style={{ backgroundColor: tile.bgColor }}>
              {tile.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tile.imageUrl} alt={tile.title} className="h-14 w-14 object-contain" />
              ) : (
                <span className="text-xs text-ink/40">No image</span>
              )}
            </div>
            <p className="text-sm font-medium text-ink" title={tile.title}>
              {tile.title}
            </p>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleActive(tile)}
                className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', tile.isActive ? 'bg-green-50 text-success' : 'bg-accent text-muted')}
              >
                {tile.isActive ? 'Active' : 'Inactive'}
              </button>
              <button type="button" onClick={() => handleDelete(tile.id)} className="text-muted hover:text-danger" aria-label={`Delete ${tile.title}`}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {!loading && tiles.length === 0 && (
          <p className="col-span-full rounded-3xl border border-border bg-card py-8 text-center text-sm text-muted">
            No tiles yet — add one above.
          </p>
        )}
      </div>
    </div>
  );
}
