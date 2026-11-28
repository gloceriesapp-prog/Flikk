'use client';

// Daily inputs for the hero: today's fish arrival time per shop ("Landed
// 6:40 AM") and which village items were picked today (Village Fresh).
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

interface Fresh {
  today: string;
  stores: { id: string; name: string }[];
  products: { id: string; name: string; category: string; picked_at: string | null }[];
  arrivals: { store_id: string; fish_arrived_at: string }[];
}
const field = 'rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs text-ink';
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

export function FreshInputs() {
  const [data, setData] = useState<Fresh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState('');
  const [time, setTime] = useState('06:30');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch('/api/today-grid/fresh');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error ?? 'Could not load fresh inputs.'); return; }
    setError(null); setData(body);
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  async function post(payload: Record<string, unknown>, done: string) {
    const res = await fetch('/api/today-grid/fresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error ?? 'Could not save.'); return; }
    toast.success(done); setPicked(new Set()); await load();
  }

  if (error) return <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;
  const pickedToday = (at: string | null) => !!at && new Date(Date.parse(at) + 330 * 60_000).toISOString().slice(0, 10) === data.today;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Today’s fish arrival</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select className={field} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Pick a shop</option>
            {data.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
          <button type="button" disabled={!storeId} onClick={() => void post({ kind: 'fish', storeId, time }, 'Arrival time saved.')}
            className="rounded-[10px] bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Save</button>
        </div>
        <ul className="mt-2 text-xs text-muted">
          {data.arrivals.length ? data.arrivals.map((a) => <li key={a.store_id}>{data.stores.find((s) => s.id === a.store_id)?.name ?? 'Shop'} · landed {istTime(a.fish_arrived_at)}</li>)
            : <li>No arrival saved today — the hero falls back to Fruits & Vegetables until one is.</li>}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold text-ink">Village items picked today</h3>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border p-2">
          {data.products.length ? data.products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 py-0.5 text-xs text-ink">
              <input type="checkbox" checked={picked.has(p.id)} onChange={(e) => setPicked((prev) => { const next = new Set(prev); if (e.target.checked) next.add(p.id); else next.delete(p.id); return next; })} />
              {p.name} <span className="text-muted">· {p.category}</span>
              {pickedToday(p.picked_at) && <span className="rounded bg-success/10 px-1 text-[10px] text-success">picked today</span>}
            </label>
          )) : <p className="text-xs text-muted">No fresh produce listed yet.</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={!picked.size} onClick={() => void post({ kind: 'picked', productIds: [...picked], picked: true }, 'Marked picked today.')}
            className="rounded-[10px] bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Mark picked today</button>
          <button type="button" disabled={!picked.size} onClick={() => void post({ kind: 'picked', productIds: [...picked], picked: false }, 'Cleared.')}
            className="rounded-[10px] border border-border px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-40">Clear</button>
        </div>
      </div>
    </div>
  );
}
