'use client';

// Delivery time by product category (app/api/delivery-windows). A category
// listed here shows "min–max min · note" on its products, its section and
// the cart; any order containing it promises the longest time. Everything
// else keeps the estimated delivery time above.
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import type { DeliveryWindow } from '@/lib/deliveryWindows';

type Draft = { category: string; min: string; max: string; note: string };
const input = 'w-14 bg-transparent text-sm font-semibold text-ink outline-none';

export function DeliveryWindowsCard() {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const apply = (windows: DeliveryWindow[]) => setRows(windows.map((w) => ({ category: w.category, min: String(w.minMinutes), max: String(w.maxMinutes), note: w.note ?? '' })));

  useEffect(() => {
    void fetch('/api/delivery-windows').then(async (res) => {
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Could not load delivery times.'); return; }
      setCategories(body.categories); apply(body.windows);
    }, () => setError('Could not load delivery times.'));
  }, []);

  async function save() {
    if (!rows) return;
    setSaving(true);
    try {
      const res = await fetch('/api/delivery-windows', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: rows.map((r) => ({ category: r.category, minMinutes: Number(r.min), maxMinutes: Number(r.max), note: r.note })) }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Save failed.');
      apply(body.windows); toast.success('Delivery times saved.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed.'); } finally { setSaving(false); }
  }

  const set = (index: number, patch: Partial<Draft>) => setRows((all) => all!.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const unused = categories.filter((c) => !rows?.some((r) => r.category === c));
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-semibold text-ink">Delivery time by category</h2>
        <p className="text-xs text-muted">For slower categories, e.g. Non Veg 45–60 min &ldquo;cut fresh&rdquo;. Shown on those products, their section and the cart; an order with any of them promises the longest time. Other categories keep the estimated delivery time.</p>
      </div>
      {error ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : !rows ? <p className="text-sm text-muted">Loading…</p> : (
        <>
          {rows.length === 0 && <p className="text-sm text-muted">No category has its own delivery time.</p>}
          {rows.map((row, index) => (
            <div key={row.category || index} className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
              <select aria-label="Category" value={row.category} onChange={(e) => set(index, { category: e.target.value })} className="min-w-[180px] rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink">
                <option value="">Choose a category</option>
                {[row.category, ...unused].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <input aria-label="Shortest minutes" type="number" min={1} max={240} value={row.min} onChange={(e) => set(index, { min: e.target.value })} className={input} />
                <span className="text-sm text-muted">to</span>
                <input aria-label="Longest minutes" type="number" min={1} max={240} value={row.max} onChange={(e) => set(index, { max: e.target.value })} className={input} />
                <span className="text-sm text-muted">min</span>
              </div>
              <input aria-label="Note" maxLength={30} placeholder="Note, e.g. cut fresh" value={row.note} onChange={(e) => set(index, { note: e.target.value })}
                className="min-w-[160px] flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-ink" />
              <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-ink hover:bg-canvas">Remove</button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button type="button" disabled={!unused.length} onClick={() => setRows([...rows, { category: unused[0] ?? '', min: '45', max: '60', note: '' }])}
              className="rounded-[10px] border border-border px-3 py-2 text-sm font-medium text-ink disabled:opacity-40">Add category</button>
            <button type="button" disabled={saving} onClick={() => void save()} className="ml-auto rounded-[10px] bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Save delivery times</button>
          </div>
        </>
      )}
    </section>
  );
}
