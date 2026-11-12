'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  popular_position: number | null;
  popular_image_url: string | null;
  popular_banner_url: string | null;
};

const ENDPOINT = '/api/brands/popular';
const fieldClass = 'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink';

function BrandPlacement({ brand, brands, onSaved }: {
  brand: Brand;
  brands: Brand[];
  onSaved: (brand: Brand) => void;
}) {
  const usedPositions = new Set(brands.filter(item => item.id !== brand.id).map(item => item.popular_position));
  const firstFree = Array.from({ length: 1000 }, (_, i) => i + 1).find(slot => !usedPositions.has(slot)) ?? 1000;
  const [shown, setShown] = useState(brand.popular_position !== null);
  const [position, setPosition] = useState<number>(brand.popular_position ?? firstFree);
  const [imageUrl, setImageUrl] = useState(brand.popular_image_url ?? '');
  const [bannerUrl, setBannerUrl] = useState(brand.popular_banner_url ?? '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (shown && usedPositions.has(position)) {
      setNotice({ message: 'That position is already taken. Choose another.', error: true });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brand.id, position: shown ? position : null, imageUrl: imageUrl.trim() || null, bannerUrl: bannerUrl.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save the brand.');
      onSaved(result as Brand);
      setNotice({ message: 'Brand saved.', error: false });
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Could not save the brand.', error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold text-ink">{brand.name}</h2>
      <fieldset disabled={saving} className="space-y-4">
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={shown} disabled={!brand.is_active && !shown}
            onChange={event => setShown(event.target.checked)} className="h-5 w-5 accent-brand" />
          Show in Categories
        </label>
        {!brand.is_active && <p className="text-xs text-muted">Inactive brands cannot be shown. You can still hide an existing placement.</p>}
        <label className="block space-y-1 text-sm font-medium">
          <span>Display position</span>
          <input type="number" min={1} max={1000} step={1} required={shown} disabled={!shown}
            className={fieldClass} value={position}
            onChange={event => setPosition(Number(event.target.value))} />
          <span className="block text-xs text-muted">Turn off Show in Categories to hide this brand. Positions 1–1000 control the order; only the first ten appear in Categories.</span>
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Brand logo</p>
          <ProductImageUpload key={imageUrl} imageUrl={imageUrl || brand.logo_url || undefined} onChange={setImageUrl} bucket="appsui" small />
          <label className="block space-y-1 text-sm">
            <span>Logo URL (optional)</span>
            <input type="url" className={fieldClass} value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="Use the existing logo" />
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Brand banner</p>
          <p className="text-xs text-muted">Shown above this brand’s products. Recommended size: 1200 × 480 px. Leave blank to keep the logo header.</p>
          <ProductImageUpload key={'banner-' + bannerUrl} imageUrl={bannerUrl || undefined} onChange={setBannerUrl} bucket="appsui" />
          <label className="block space-y-1 text-sm">
            <span>Banner URL (optional)</span>
            <input type="url" className={fieldClass} value={bannerUrl} onChange={event => setBannerUrl(event.target.value)} placeholder="https://images.gloceries.com/…" />
          </label>
        </div>
      </fieldset>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'text-sm text-danger' : 'text-sm text-ink'}>{notice.message}</p>}
      <button type="submit" disabled={saving || (!brand.is_active && shown)} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? 'Saving…' : 'Save brand'}
      </button>
    </form>
  );
}

export default function PopularBrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(ENDPOINT, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Brand[]>;
      })
      .then(rows => { if (!controller.signal.aborted) setBrands(rows); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [attempt]);

  const selected = brands?.find(brand => brand.id === selectedId);
  const placed = (brands ?? []).filter(brand => brand.popular_position !== null)
    .sort((a, b) => a.popular_position! - b.popular_position!);
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Popular Brands</h1>
        <p className="mt-1 text-sm text-muted">Choose the brand icons and their order. Categories shows five per row, up to ten; additional selected brands appear under See all.</p>
      </header>
      {loadError ? (
        <p role="alert" className="text-sm text-danger">
          Could not load brands.{' '}
          <button type="button" className="underline" onClick={() => { setLoadError(false); setAttempt(value => value + 1); }}>Try again</button>
        </p>
      ) : !brands ? <p className="text-sm text-muted">Loading brands…</p> : (
        <>
          <div className="flex flex-wrap gap-2">
            {placed.map(brand => (
              <button type="button" key={brand.id} onClick={() => setSelectedId(brand.id)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
                {brand.popular_position}. {brand.name}{brand.is_active ? '' : ' (inactive)'}
              </button>
            ))}
          </div>
          <label className="block max-w-xl space-y-1 text-sm font-medium">
            <span>Existing brand</span>
            <select className={fieldClass} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
              <option value="">Choose a brand</option>
              {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_active ? '' : ' (inactive)'}</option>)}
            </select>
          </label>
          {selected && <BrandPlacement key={selected.id} brand={selected} brands={brands} onSaved={brand => setBrands(rows => rows?.map(row => row.id === brand.id ? brand : row) ?? null)} />}
        </>
      )}
    </div>
  );
}
