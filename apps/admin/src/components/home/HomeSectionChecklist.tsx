'use client';

// The Home sections a product can be picked in, as ticks. Shared by
// Inventory's Home button (ShowOnHomeModal) and the Add / Edit product forms,
// so a product can be placed on Home the moment it is uploaded.
// useHomeSectionChoice loads the sections (and, for an existing product, the
// ones it is already in); saveProductHomeSections writes the ticks.

import { useEffect, useState } from 'react';
import { acceptsPins, pinCapacity } from '@/lib/homeSectionPins';

const RAIL_LABELS: Record<string, string> = {
  trending: 'Trending',
  'most-bought': 'Most Bought',
  'deals-for-you': 'Deals for You',
  'todays-best-deals': "Today's Best Deals",
  'price-drops': 'Price Drops',
  'everyday-essentials': 'Everyday Essentials',
  'everyday-dairy': 'Everyday Dairy',
};

export interface SectionOption { key: string; label: string; enabled: boolean; count: number }

export function useHomeSectionChoice(productId?: string) {
  const [options, setOptions] = useState<SectionOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sectionsRes, mineRes] = await Promise.all([
          fetch('/api/home-sections'),
          productId ? fetch(`/api/home-sections/by-product?productId=${encodeURIComponent(productId)}`) : null,
        ]);
        if (!sectionsRes.ok || (mineRes && !mineRes.ok)) throw new Error('Could not load the home sections.');
        const sections = (await sectionsRes.json()) as { key: string; title: string | null; enabled: boolean; is_custom: boolean; product_ids: string[] }[];
        const mine = mineRes ? ((await mineRes.json()) as { keys: string[] }).keys : [];
        if (cancelled) return;
        setOptions(sections.filter((s) => acceptsPins(s.key)).map((s) => ({
          key: s.key,
          label: s.is_custom ? (s.title || 'Untitled section') : (s.title || RAIL_LABELS[s.key] || s.key),
          enabled: s.enabled,
          count: s.product_ids.length,
        })));
        setSelected(new Set(mine));
        setInitial([...mine].sort().join());
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the home sections.');
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const keys = [...selected];
  // null until loaded, so a form never overwrites picks it did not show.
  const changedKeys = options && keys.sort().join() !== initial ? keys : null;
  return { options, selected, toggle, keys, changedKeys, error };
}

export async function saveProductHomeSections(productId: string, keys: string[]): Promise<string[]> {
  const res = await fetch('/api/home-sections/by-product', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, keys }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Could not save the home sections.');
  return body.keys as string[];
}

export function HomeSectionChecklist({ choice, compact = false }: {
  choice: ReturnType<typeof useHomeSectionChoice>;
  compact?: boolean;
}) {
  const { options, selected, toggle, error } = choice;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!options) return <p className="text-sm text-muted">Loading home sections…</p>;
  if (options.length === 0) return <p className="text-sm text-muted">No home sections take products yet.</p>;
  return (
    <div className={compact ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2' : 'flex flex-col divide-y divide-border rounded-xl border border-border'}>
      {options.map((option) => (
        <label key={option.key}
          className={compact
            ? 'flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-accent/60'
            : 'flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/60'}>
          <input type="checkbox" checked={selected.has(option.key)} onChange={() => toggle(option.key)} className="h-4 w-4 rounded border-border" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{option.label}</span>
            {!compact && (
              <span className="block text-xs text-muted">
                {option.count} picked · shows {pinCapacity(option.key)}{option.enabled ? '' : ' · hidden on Home'}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
