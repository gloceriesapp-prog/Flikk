'use client';

// The product's brand: pick one from the list, or "Add new brand" (name +
// optional logo) when it isn't there yet. The new brand is saved straight
// away and selected. Optional: loose produce and local items have no brand.
// Logos go in the "stores" image folder (same kind of square logo artwork).

import { useEffect, useState } from 'react';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import type { Brand } from '@/lib/types';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export function BrandPicker({ brandId, onChange }: {
  brandId: string | null | undefined;
  onChange: (brandId: string | undefined) => void;
}) {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/brands')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((rows: Brand[]) => { if (live) setBrands(rows); })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, []);

  async function saveBrand() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter the brand name.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, logoUrl }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not add the brand.');
      const brand = body as Brand;
      setBrands((list) => [...(list ?? []).filter((b) => b.id !== brand.id), brand].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(brand.id);
      setAdding(false);
      setName('');
      setLogoUrl(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the brand.');
    } finally {
      setSaving(false);
    }
  }

  const selected = brands?.find((b) => b.id === brandId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Brand <span className="font-normal text-muted">(optional)</span></span>
        {!adding && (
          <button type="button" onClick={() => { setAdding(true); setError(null); }} className="text-sm font-semibold text-brand hover:underline">
            Add new brand
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {selected?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote CDN logo, same as other admin thumbnails
          <img src={selected.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-contain" />
        )}
        <select
          value={brandId ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={brands === null && !loadError}
          className={FIELD_CLASS}
          aria-label="Brand"
        >
          <option value="">{brands === null && !loadError ? 'Loading brands…' : 'No brand'}</option>
          {(brands ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.isActive ? '' : ' (hidden)'}</option>
          ))}
        </select>
      </div>
      {loadError && <p className="text-xs text-danger">Could not load brands. Reload the page to try again.</p>}

      {adding && (
        <div className="space-y-3 rounded-xl border border-border bg-accent p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={FIELD_CLASS}
            placeholder="Brand name (e.g. Amul)"
            aria-label="New brand name"
          />
          <div>
            <p className="mb-1 text-xs text-muted">Brand logo (optional)</p>
            <ProductImageUpload imageUrl={logoUrl} onChange={(url) => setLogoUrl(url)} bucket="stores" small />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setError(null); }} className="rounded-[10px] px-3 py-1.5 text-sm text-muted hover:text-ink">
              Cancel
            </button>
            <button type="button" onClick={() => void saveBrand()} disabled={saving}
              className="rounded-[10px] bg-brand px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand-strong">
              {saving ? 'Saving…' : 'Save brand'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
