'use client';

// Festival Greeting — the singleton greeting banner (title + tagline +
// up to 3 category chips) and the customer Home festival tab (on/off, tab
// title, colours, artwork; migration 112). The tab is off until switched on
// here; its shelves are the Festival Section's products, or keyword-matched
// nearby stock when that section has none. Same load()/save() fetch shape
// as festival-section/page.tsx.

import { useCallback, useEffect, useState } from 'react';

interface GreetingCategory {
  id: string;
  title: string;
}

interface FestivalGreeting {
  id: string;
  is_active: boolean;
  title: string | null;
  tagline: string | null;
  categories: GreetingCategory[] | null;
  tab_enabled: boolean;
  tab_title: string;
  tab_background_color: string;
  tab_header_color: string;
  tab_header_image_url: string | null;
  tab_banner_image_url: string | null;
}

const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export default function FestivalGreetingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [categories, setCategories] = useState<GreetingCategory[]>([]);
  const [tabEnabled, setTabEnabled] = useState(false);
  const [tabTitle, setTabTitle] = useState('Navratri');
  const [tabBackgroundColor, setTabBackgroundColor] = useState('#FFF1D6');
  const [tabHeaderColor, setTabHeaderColor] = useState('#F6C667');
  const [tabHeaderImageUrl, setTabHeaderImageUrl] = useState('');
  const [tabBannerImageUrl, setTabBannerImageUrl] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/festival-greeting');
      const data: FestivalGreeting | null = res.ok ? await res.json() : null;
      setTitle(data?.title ?? '');
      setTagline(data?.tagline ?? '');
      setIsActive(data?.is_active ?? false);
      setCategories(Array.isArray(data?.categories) ? data!.categories! : []);
      setTabEnabled(data?.tab_enabled ?? false);
      setTabTitle(data?.tab_title ?? 'Navratri');
      setTabBackgroundColor(data?.tab_background_color ?? '#FFF1D6');
      setTabHeaderColor(data?.tab_header_color ?? '#F6C667');
      setTabHeaderImageUrl(data?.tab_header_image_url ?? '');
      setTabBannerImageUrl(data?.tab_banner_image_url ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the festival greeting.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  function updateCategoryTitle(id: string, value: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, title: value } : c)));
  }

  async function handleSave() {
    if (!tabTitle.trim()) {
      setError('Give the festival tab a title.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/festival-greeting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, tagline, is_active: isActive, categories,
          tab_enabled: tabEnabled,
          tab_title: tabTitle.trim(),
          tab_background_color: tabBackgroundColor,
          tab_header_color: tabHeaderColor,
          tab_header_image_url: tabHeaderImageUrl,
          tab_banner_image_url: tabBannerImageUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed.');
      await load();
      setSaved(true);
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
        <h1 className="text-3xl font-bold text-ink">Festival Greeting</h1>
        <p className="text-sm text-muted">The festival tab on the customer Home screen, with its greeting banner and category chips.</p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Festival tab</h2>
        <p className="mb-4 text-xs text-muted">
          When on, a tab with this title appears first after All. Its products are the ones picked on the Festival Section
          page; with none picked, it shows matching items from nearby shops (puja, flowers, sweets, fruit, lights, decor).
          When off, customers see no festival tab.
        </p>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={tabEnabled} onChange={(e) => setTabEnabled(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Show the festival tab
          </label>
          <div>
            <label htmlFor="tab-title" className="mb-1.5 block text-xs font-medium text-muted">Tab title</label>
            <input id="tab-title" value={tabTitle} maxLength={30} onChange={(e) => setTabTitle(e.target.value)} placeholder="e.g. Diwali" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['tab-bg', 'Page background', tabBackgroundColor, setTabBackgroundColor],
              ['tab-header', 'Header colour', tabHeaderColor, setTabHeaderColor],
            ] as const).map(([id, label, value, setValue]) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
                <div className="flex items-center gap-2">
                  <input id={id} type="color" value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} className="h-10 w-12 rounded-lg border border-border bg-canvas" />
                  <span className="text-sm font-medium text-ink">{value}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="tab-header-image" className="mb-1.5 block text-xs font-medium text-muted">Header artwork (storage path or https URL)</label>
            <input id="tab-header-image" value={tabHeaderImageUrl} onChange={(e) => setTabHeaderImageUrl(e.target.value)} placeholder="Images/diwali-header.png" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tab-banner-image" className="mb-1.5 block text-xs font-medium text-muted">Greeting banner (wide image, about 2116 × 743; blank hides it)</label>
            <input id="tab-banner-image" value={tabBannerImageUrl} onChange={(e) => setTabBannerImageUrl(e.target.value)} placeholder="Images/diwali-banner.png" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Greeting</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Happy Ganesh Chaturthi" className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Tagline</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Everything you need for the celebration" className={inputClass} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Show the greeting panel in the festival tab
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Categories</h2>
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
              <input value={c.title} onChange={(e) => updateCategoryTitle(c.id, e.target.value)} placeholder="Category title" className={`flex-1 ${inputClass}`} />
            </div>
          ))}
          {categories.length === 0 && <p className="py-6 text-center text-sm text-muted">No categories set yet.</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !saving && <span role="status" className="text-xs text-green-700">Saved. Customers see it within a few seconds.</span>}
      </div>
    </div>
  );
}
