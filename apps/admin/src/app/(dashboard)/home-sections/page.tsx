'use client';

// Home Sections — controls the customer Home "All" tab layout (home_sections,
// migration 058). Per section: show/hide, reorder (↑/↓), rename the heading,
// set a subtitle, and an optional background color. Save writes the whole list
// back (PUT /api/home-sections) which reindexes sort_index from the on-screen
// order. Same load()/save() + shared UI kit as festival-greeting/page.tsx.

import { useCallback, useEffect, useState } from 'react';

interface HomeSection {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sort_index: number;
  bg_color: string | null;
}

// Friendly names + the component's own default heading (shown as the input
// placeholder so the founder sees what "leave blank" falls back to).
const SECTION_META: Record<string, { label: string; defaultTitle: string }> = {
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

function labelFor(key: string) {
  return SECTION_META[key]?.label ?? key;
}

export default function HomeSectionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/home-sections');
      const data: HomeSection[] = res.ok ? await res.json() : [];
      setSections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the home sections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Home Sections</h1>
        <p className="text-sm text-muted">
          Reorder, rename, recolor, or hide the sections on the customer Home screen. Changes go live for everyone on save.
        </p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <div
            key={s.key}
            className={`rounded-3xl border border-border bg-card p-5 ${s.enabled ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-lg px-2 py-0.5 text-ink hover:bg-canvas disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === sections.length - 1}
                    aria-label="Move down"
                    className="rounded-lg px-2 py-0.5 text-ink hover:bg-canvas disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{labelFor(s.key)}</p>
                  <p className="text-xs text-muted">{s.key}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => patch(s.key, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                {s.enabled ? 'Shown' : 'Hidden'}
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
                <input
                  value={s.title ?? ''}
                  onChange={(e) => patch(s.key, { title: e.target.value })}
                  placeholder={SECTION_META[s.key]?.defaultTitle ?? 'Default heading'}
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Subtitle</label>
                <input
                  value={s.subtitle ?? ''}
                  onChange={(e) => patch(s.key, { subtitle: e.target.value })}
                  placeholder="Optional sub-copy"
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Background color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.bg_color ?? '#ffffff'}
                    onChange={(e) => patch(s.key, { bg_color: e.target.value })}
                    className="h-9 w-10 rounded-lg border border-border bg-canvas"
                  />
                  <input
                    value={s.bg_color ?? ''}
                    onChange={(e) => patch(s.key, { bg_color: e.target.value })}
                    placeholder="#RRGGBB (blank = default)"
                    className="flex-1 rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                  {s.bg_color && (
                    <button
                      type="button"
                      onClick={() => patch(s.key, { bg_color: null })}
                      className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-canvas"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {sections.length === 0 && <p className="py-6 text-center text-sm text-muted">No sections found. Run migration 058.</p>}
      </div>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
