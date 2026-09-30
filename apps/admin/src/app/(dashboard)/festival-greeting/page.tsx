'use client';

// Festival Greeting — the singleton greeting banner (title + tagline +
// up to 3 category chips) the customer app reads. Same load()/save()
// fetch shape as festival-section/page.tsx; matches the shared admin UI
// kit (border/bg-card/rounded-3xl inputs, ink save button).

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
}

export default function FestivalGreetingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [categories, setCategories] = useState<GreetingCategory[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/festival-greeting');
      const data: FestivalGreeting | null = res.ok ? await res.json() : null;
      setTitle(data?.title ?? '');
      setTagline(data?.tagline ?? '');
      setIsActive(data?.is_active ?? false);
      setCategories(Array.isArray(data?.categories) ? data!.categories! : []);
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
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/festival-greeting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tagline, is_active: isActive, categories }),
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
        <h1 className="text-3xl font-bold text-ink">Festival Greeting</h1>
        <p className="text-sm text-muted">The greeting banner and category chips shown at the top of the customer Home screen.</p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Happy Ganesh Chaturthi"
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Everything you need for the celebration"
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Show festival section
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Categories</h2>
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
              <input
                value={c.title}
                onChange={(e) => updateCategoryTitle(c.id, e.target.value)}
                placeholder="Category title"
                className="flex-1 rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>
          ))}
          {categories.length === 0 && <p className="py-6 text-center text-sm text-muted">No categories set yet.</p>}
        </div>
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
