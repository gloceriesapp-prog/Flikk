'use client';

// Inventory → "Show on home": tick the Home sections this product should be
// picked in. A newly ticked section adds it at the end of that section's
// picks (reorder on the Home Sections page); unticking removes it.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from '@/components/icons';
import { toast } from '@/components/ui/Toast';
import { acceptsPins, pinCapacity } from '@/lib/homeSectionPins';
import type { Product } from '@/lib/types';

const RAIL_LABELS: Record<string, string> = {
  trending: 'Trending',
  'most-bought': 'Most Bought',
  'deals-for-you': 'Deals for You',
  'todays-best-deals': "Today's Best Deals",
  'price-drops': 'Price Drops',
  'everyday-essentials': 'Everyday Essentials',
};

interface SectionOption { key: string; label: string; enabled: boolean; count: number }

export function ShowOnHomeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [options, setOptions] = useState<SectionOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sectionsRes, mineRes] = await Promise.all([
          fetch('/api/home-sections'),
          fetch(`/api/home-sections/by-product?productId=${encodeURIComponent(product.id)}`),
        ]);
        if (!sectionsRes.ok || !mineRes.ok) throw new Error('Could not load the home sections.');
        const sections = (await sectionsRes.json()) as { key: string; title: string | null; enabled: boolean; is_custom: boolean; product_ids: string[] }[];
        const mine = (await mineRes.json()) as { keys: string[] };
        if (cancelled) return;
        setOptions(sections.filter((s) => acceptsPins(s.key)).map((s) => ({
          key: s.key,
          label: s.is_custom ? (s.title || 'Untitled section') : (s.title || RAIL_LABELS[s.key] || s.key),
          enabled: s.enabled,
          count: s.product_ids.length,
        })));
        setSelected(new Set(mine.keys));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the home sections.');
      }
    })();
    return () => { cancelled = true; };
  }, [product.id]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/home-sections/by-product', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, keys: [...selected] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save.');
      toast.success('Home sections updated', body.keys.length ? `${product.name} is picked in ${body.keys.length} section${body.keys.length === 1 ? '' : 's'}.` : `${product.name} is no longer picked on Home.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  // Portalled to <body>: the dashboard's page transition transforms its
  // content, which would otherwise pin this "fixed" overlay to the page area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="show-on-home-title" className="card relative w-full max-w-md animate-rise p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="show-on-home-title" className="text-base font-semibold text-ink">Show on home</h2>
            <p className="mt-1 text-sm text-ink-soft">{product.name} · {product.storeName}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        {(product.approvalStatus ?? 'approved') !== 'approved' && (
          <p className="mt-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">Customers see it only after the product is approved.</p>
        )}

        <div className="mt-4 flex flex-col divide-y divide-border rounded-xl border border-border">
          {!options && !error && <p className="px-3 py-4 text-sm text-muted">Loading…</p>}
          {options?.map((option) => (
            <label key={option.key} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/60">
              <input type="checkbox" checked={selected.has(option.key)} onChange={() => toggle(option.key)} className="h-4 w-4 rounded border-border" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{option.label}</span>
                <span className="block text-xs text-muted">
                  {option.count} picked · shows {pinCapacity(option.key)}{option.enabled ? '' : ' · hidden on Home'}
                </span>
              </span>
            </label>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Link href="/home-sections" className="text-[13px] font-medium text-ink hover:underline">Reorder on Home Sections</Link>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!options || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
