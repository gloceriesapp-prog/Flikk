'use client';

// Home Sections — controls the customer Home "All" tab (home_sections,
// migration 058). Per section: show/hide, reorder (↑/↓), rename the heading,
// a subtitle, a background color, and an optional schedule. Product rails
// (Trending, Most Bought, the deal rows, Everyday Essentials) and sections you
// create here take hand-picked products: pins fill the first cards in your
// order, the automatic feed fills the rest unless "Only show my picks" is on
// (migration 20261027150000). Save writes the layout (PUT /api/home-sections)
// and then each changed product list (PUT /api/home-sections/products).

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/icons';
import { ProductPinPicker } from '@/components/home/ProductPinPicker';
import { confirmAction, toast } from '@/components/ui/Toast';
import { acceptsPins, isoToScheduleInput, pinCapacity } from '@/lib/homeSectionPins';
import type { Product } from '@/lib/types';

interface HomeSection {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sort_index: number;
  bg_color: string | null;
  is_custom: boolean;
  pinned_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
  product_ids: string[];
}

// Friendly names + the component's own default heading (shown as the input
// placeholder so the founder sees what "leave blank" falls back to).
const SECTION_META: Record<string, { label: string; defaultTitle: string }> = {
  'quick-categories': { label: 'Quick categories', defaultTitle: 'Quick categories (heading hidden when first)' },
  'everyday-dairy': { label: 'Everyday Dairy', defaultTitle: 'Everyday Dairy' },
  'festival-greeting': { label: 'Festival Greeting', defaultTitle: '(managed in Festival Greeting)' },
  'festival-picks': { label: 'Festival Section products', defaultTitle: '(the Festival Section title)' },
  seasonal: { label: 'Seasonal Section', defaultTitle: '(no heading)' },
  'nearby-stores': { label: 'Nearby Stores', defaultTitle: 'Nearby Stores' },
  trending: { label: 'Trending', defaultTitle: 'Popular This Week' },
  'most-bought': { label: 'Most Bought', defaultTitle: 'Most Bought Near You' },
  'category-sections': { label: 'Category Sections', defaultTitle: '(per-category titles)' },
  'deals-for-you': { label: 'Deals for You', defaultTitle: 'Everyday Savings' },
  'top-rated-stores': { label: 'Top Rated Stores', defaultTitle: 'Top Rated Stores Near You' },
  'deals-section': { label: 'Deals Section', defaultTitle: '(own layout)' },
  'todays-best-deals': { label: "Today's Best Deals", defaultTitle: 'Today’s Best Deals' },
  'price-drops': { label: 'Price Drops', defaultTitle: 'Biggest Price Drops' },
  'everyday-essentials': { label: 'Everyday Essentials', defaultTitle: 'Everyday Essentials' },
  'new-on-gloceries': { label: 'New on Gloceries', defaultTitle: 'New on Gloceries' },
  'brand-footer': { label: 'Brand Footer', defaultTitle: '(no heading)' },
};

function labelFor(section: HomeSection) {
  if (section.is_custom) return section.title || 'New section';
  return SECTION_META[section.key]?.label ?? section.key;
}

const fromServer = (rows: HomeSection[]) => rows.map((row) => ({
  ...row, starts_at: isoToScheduleInput(row.starts_at), ends_at: isoToScheduleInput(row.ends_at),
}));

const inputClass = 'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-ink';

export default function HomeSectionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [savedPins, setSavedPins] = useState<Record<string, string[]>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const applyServer = useCallback((rows: HomeSection[]) => {
    setSections(fromServer(rows));
    setSavedPins(Object.fromEntries(rows.map((row) => [row.key, row.product_ids])));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sectionsRes, productsRes] = await Promise.all([fetch('/api/home-sections'), fetch('/api/products')]);
      if (!sectionsRes.ok) throw new Error((await sectionsRes.json()).error ?? 'Could not load the home sections.');
      applyServer(await sectionsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the home sections.');
    } finally {
      setLoading(false);
    }
  }, [applyServer]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const dirtyPins = useMemo(
    () => sections.filter((s) => acceptsPins(s.key) && (savedPins[s.key] ?? []).join() !== s.product_ids.join()),
    [sections, savedPins],
  );

  function patch(key: string, changes: Partial<HomeSection>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...changes } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/home-sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed.');
      for (const section of dirtyPins) {
        const pinRes = await fetch('/api/home-sections/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: section.key, productIds: section.product_ids }),
        });
        if (!pinRes.ok) throw new Error(`${labelFor(section)}: ${(await pinRes.json()).error ?? 'could not save the products.'}`);
      }
      await load();
      toast.success('Home sections saved', 'Customers see the change within a minute.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    const res = await fetch('/api/home-sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
    });
    const body = await res.json();
    if (!res.ok) { toast.error('Could not add the section', body.error); return; }
    // Keep unsaved edits; just append the new row the server made.
    const created = (body as HomeSection[]).find((row) => !sections.some((s) => s.key === row.key));
    if (created) {
      setSections((prev) => [...prev, ...fromServer([created])]);
      setSavedPins((prev) => ({ ...prev, [created.key]: [] }));
      setOpenPicker(created.key);
    }
    setNewTitle('');
    toast.success('Section added', 'Pick its products, switch it on, then save.');
  }

  async function handleDelete(section: HomeSection) {
    const ok = await confirmAction({
      title: `Delete “${labelFor(section)}”?`,
      message: 'The section and its picked products are removed from the Home screen.',
      confirmLabel: 'Delete', tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/home-sections?key=${encodeURIComponent(section.key)}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete the section', (await res.json()).error); return; }
    setSections((prev) => prev.filter((s) => s.key !== section.key));
    toast.success('Section deleted');
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Home Sections</h1>
          <p className="page-subtitle">
            Order, rename, schedule or hide the sections on the customer Home screen, and pick the products that matter most.
          </p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void handleCreate(); }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={60}
            placeholder="New section title, e.g. Monsoon must-haves" className={clsx(inputClass, 'w-72')} />
          <button type="submit" className="btn btn-secondary" disabled={!newTitle.trim()}><Plus size={14} /> New section</button>
        </form>
      </div>

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        {sections.map((s, i) => {
          const pinnable = acceptsPins(s.key);
          const capacity = pinCapacity(s.key);
          return (
            <div key={s.key} className={clsx('card p-5', !s.enabled && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="icon-btn h-7 w-7"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label="Move down" className="icon-btn h-7 w-7"><ArrowDown size={14} /></button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{labelFor(s)}</p>
                      {s.is_custom && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-ink-soft">Your section</span>}
                      {pinnable && s.product_ids.length > 0 && (
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">{s.product_ids.length} picked</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{s.key}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {s.is_custom && (
                    <button type="button" className="btn btn-ghost" onClick={() => void handleDelete(s)}><Trash2 size={14} /> Delete</button>
                  )}
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input type="checkbox" checked={s.enabled} onChange={(e) => patch(s.key, { enabled: e.target.checked })} className="h-4 w-4 rounded border-border" />
                    {s.enabled ? 'Shown' : 'Hidden'}
                  </label>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
                  <input value={s.title ?? ''} onChange={(e) => patch(s.key, { title: e.target.value })}
                    placeholder={s.is_custom ? 'Required' : SECTION_META[s.key]?.defaultTitle ?? 'Default heading'} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Subtitle</label>
                  <input value={s.subtitle ?? ''} onChange={(e) => patch(s.key, { subtitle: e.target.value })} placeholder="Optional sub-copy" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Background color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={s.bg_color ?? '#ffffff'} onChange={(e) => patch(s.key, { bg_color: e.target.value })} className="h-9 w-10 rounded-lg border border-border bg-card" />
                    <input value={s.bg_color ?? ''} onChange={(e) => patch(s.key, { bg_color: e.target.value })} placeholder="#RRGGBB (blank = default)" className={clsx(inputClass, 'flex-1')} />
                    {s.bg_color && <button type="button" onClick={() => patch(s.key, { bg_color: null })} className="btn btn-ghost">Clear</button>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Show from (IST)</label>
                    <input type="datetime-local" value={s.starts_at ?? ''} onChange={(e) => patch(s.key, { starts_at: e.target.value || null })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Hide after (IST)</label>
                    <input type="datetime-local" value={s.ends_at ?? ''} onChange={(e) => patch(s.key, { ends_at: e.target.value || null })} className={inputClass} />
                  </div>
                </div>
              </div>

              {pinnable && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Picked products</p>
                      <p className="text-xs text-muted">
                        {s.is_custom
                          ? `Shows your first ${capacity} in-stock picks, in this order.`
                          : s.pinned_only
                            ? `Shows only your picks — the first ${capacity} in stock, in this order.`
                            : `Your picks fill the first of ${capacity} cards; the rest stay automatic.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!s.is_custom && (
                        <label className="flex items-center gap-2 text-sm text-ink">
                          <input type="checkbox" checked={s.pinned_only} onChange={(e) => patch(s.key, { pinned_only: e.target.checked })} className="h-4 w-4 rounded border-border" />
                          Only show my picks
                        </label>
                      )}
                      <button type="button" className="btn btn-secondary" onClick={() => setOpenPicker(openPicker === s.key ? null : s.key)}>
                        {openPicker === s.key ? 'Done' : s.product_ids.length ? 'Edit products' : 'Pick products'}
                      </button>
                    </div>
                  </div>
                  {openPicker === s.key && (
                    <div className="mt-3">
                      <ProductPinPicker productIds={s.product_ids} products={products} capacity={capacity}
                        onChange={(ids) => patch(s.key, { product_ids: ids })} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {sections.length === 0 && <p className="py-6 text-center text-sm text-muted">No sections found. Run migration 058.</p>}
      </div>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {dirtyPins.length > 0 && <p className="text-xs text-muted">Unsaved product picks in {dirtyPins.map(labelFor).join(', ')}.</p>}
      </div>
    </div>
  );
}
