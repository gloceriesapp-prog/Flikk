'use client';

// Picks the Home "NEW for you" tile pictures from cut-out products (the
// worker's transparent product-only copies), shown on the tile's own green
// so any leftover background would be obvious. Up to 4, rotated in the app.

import { useCallback, useEffect, useState } from 'react';
import type { ProductCutout } from '@/app/api/product-images/cutouts/route';

const MAX = 4;

export function NewForYouPicker() {
  const [cutouts, setCutouts] = useState<ProductCutout[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, current] = await Promise.all([
      fetch('/api/product-images/cutouts').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/product-images/new-for-you').then((r) => (r.ok ? r.json() : [])),
    ]).catch(() => [[], []]);
    setCutouts(list as ProductCutout[]);
    setSelected(current as string[]);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  function toggle(url: string) {
    setMessage(null);
    setSelected((current) => current.includes(url) ? current.filter((u) => u !== url) : current.length < MAX ? [...current, url] : current);
  }

  function pickRandom() {
    const pool = cutouts.map((c) => c.cutoutUrl);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSelected(pool.slice(0, MAX));
    setMessage(null);
  }

  async function save(urls: string[]) {
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/product-images/new-for-you', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save.');
      setSelected(urls);
      setMessage(urls.length ? 'Saved. The app shows them within a minute.' : 'Cleared. The app shows new product photos instead.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby="new-for-you-picker">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="new-for-you-picker" className="text-sm font-semibold text-ink">“NEW for you” tile pictures</h2>
          <p className="mt-1 text-xs text-muted">
            Products with their background removed. Pick up to {MAX} ({selected.length}/{MAX} picked); the Home tile beside search rotates through them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={pickRandom} disabled={cutouts.length === 0 || saving}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Pick {MAX} at random</button>
          <button type="button" onClick={() => void save([])} disabled={saving}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Clear</button>
          <button type="button" onClick={() => void save(selected)} disabled={saving || selected.length === 0}
            className="rounded-xl bg-[#155DFC] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      {message && <p className="text-xs font-medium text-success">{message}</p>}
      {cutouts.length === 0 ? (
        <p className="text-xs text-muted">No cut-out products yet. They appear here as product photos are cleaned.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {cutouts.map((cutout) => {
            const position = selected.indexOf(cutout.cutoutUrl);
            return (
              <button
                key={cutout.productId}
                type="button"
                onClick={() => toggle(cutout.cutoutUrl)}
                title={cutout.productName}
                aria-pressed={position >= 0}
                className={`relative h-20 w-20 rounded-2xl bg-[#E3F5C6] p-1.5 transition ${position >= 0 ? 'ring-2 ring-[#155DFC]' : 'hover:ring-1 hover:ring-ink/20'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cutout.cutoutUrl} alt={cutout.productName} className="h-full w-full object-contain" />
                {position >= 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#155DFC] text-[10px] font-bold text-white">{position + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
