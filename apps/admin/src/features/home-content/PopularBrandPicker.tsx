'use client';

import { useEffect, useState } from 'react';
import { createItem, type HomeContentItem } from '@/lib/homeContent';
import { Field, inputClass, Toggle } from './Fields';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  popular_image_url: string | null;
  popular_position: number | null;
  is_active: boolean;
}

export function PopularBrandPicker({ items, onChange }: {
  items: HomeContentItem[];
  onChange: (items: HomeContentItem[]) => void;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selected, setSelected] = useState('');
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/brands/popular', { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load Popular Brands.');
      const rows: Brand[] = await response.json();
      if (controller.signal.aborted) return;
      setBrands(rows.filter(brand => brand.is_active && brand.popular_position !== null));
      setLoad('ready');
    }).catch(() => {
      if (!controller.signal.aborted) setLoad('error');
    });
    return () => controller.abort();
  }, [attempt]);

  const byItemId = new Map(brands.map(brand => [`brand-${brand.id}`, brand]));
  const chosen = new Set(items.map(item => item.id));
  const available = [...byItemId].filter(([id]) => !chosen.has(id));

  function addBrand() {
    const brand = byItemId.get(selected);
    if (!brand || chosen.has(selected) || items.length >= 40) return;
    const item = createItem(selected, brand.name);
    item.imageUrl = brand.popular_image_url ?? brand.logo_url ?? '';
    item.selection.mode = 'manual';
    onChange([...items, item]);
    setSelected('');
  }

  function moveBrand(index: number, offset: number) {
    const next = [...items];
    const target = index + offset;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-800">Popular Brands</h3>
      <p className="text-xs text-slate-500">The first four visible brands appear on this page. Explore more opens Popular Brands.</p>
      {load === 'error' ? (
        <button type="button" className="text-sm text-blue-700" onClick={() => {
          setLoad('loading');
          setAttempt(value => value + 1);
        }}>Retry loading Popular Brands</button>
      ) : (
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label="Choose an existing brand">
              <select className={inputClass} value={selected} disabled={load === 'loading'}
                onChange={event => setSelected(event.target.value)}>
                <option value="">{load === 'loading' ? 'Loading brands…' : available.length ? 'Select a brand' : 'No more Popular Brands available'}</option>
                {available.map(([id, brand]) => <option key={id} value={id}>{brand.name}</option>)}
              </select>
            </Field>
          </div>
          <button type="button" disabled={!selected || items.length >= 40} onClick={addBrand}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-30">Add brand</button>
        </div>
      )}
      {items.map((item, index) => {
        const brand = byItemId.get(item.id);
        const image = brand?.popular_image_url ?? brand?.logo_url ?? item.imageUrl;
        return (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-10 w-10 rounded-lg bg-slate-100 object-contain" />
            )}
            <div className="min-w-32 flex-1">
              <p className="font-semibold text-slate-800">{brand?.name ?? item.title}</p>
              {load === 'ready' && !brand && <p className="text-xs text-slate-500">Unavailable in Popular Brands</p>}
            </div>
            <Toggle label="Visible" checked={item.enabled} onChange={enabled =>
              onChange(items.map(brand => brand.id === item.id ? { ...brand, enabled } : brand))} />
            <button type="button" className="disabled:opacity-30" disabled={index === 0} onClick={() => moveBrand(index, -1)}>Move up</button>
            <button type="button" className="disabled:opacity-30" disabled={index === items.length - 1} onClick={() => moveBrand(index, 1)}>Move down</button>
            <button type="button" className="text-red-700" onClick={() => onChange(items.filter(brand => brand.id !== item.id))}>Remove</button>
          </div>
        );
      })}
    </div>
  );
}
