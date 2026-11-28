'use client';

// Today on Gloceries — the Home grid's rules: master switch, per-card
// edits, IST slot table + backups, festival dates and rain, daily fresh
// inputs, and a preview that runs the same pure function as the server.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { DEFAULT_CONFIG, previewGrid, type SampleUser, type TodayGridConfig } from '@/lib/home/todayGrid';
import { CardsEditor } from '@/features/today-grid/CardsEditor';
import { FreshInputs } from '@/features/today-grid/FreshInputs';
import { GridPreview } from '@/features/today-grid/GridPreview';
import { SlotsEditor } from '@/features/today-grid/SlotsEditor';

const field = 'rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs text-ink';
const istNow = () => new Date(Date.now() + 330 * 60_000).toISOString();

export default function TodayGridPage() {
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<TodayGridConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({ date: istNow().slice(0, 10), time: istNow().slice(11, 16), user: 'regular' as SampleUser, data: 'full' as 'full' | 'limited', width: 390 });

  const load = useCallback(async () => {
    const res = await fetch('/api/today-grid');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error ?? 'Could not load the Today grid.'); setConfig(DEFAULT_CONFIG); return; }
    setEnabled(body.enabled); setConfig(body.config); setError(null);
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const grid = useMemo(() => (config ? previewGrid({ ...preview, config }) : null), [config, preview]);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/today-grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, config }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Could not save.');
      setConfig(body.config); toast.success('Today grid saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally { setSaving(false); }
  }

  if (!config) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Today grid</h1>
        <p className="text-sm text-muted">“Today on Gloceries” on customer Home: a fresh hero and four cards that change with the time of day. Cards without live data are swapped for backups automatically.</p>
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="card flex flex-wrap items-center gap-6 p-5 text-sm">
        <label className="flex items-center gap-2 font-medium text-ink"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Show on Home</label>
        <label className="flex items-center gap-2 text-ink"><input type="checkbox" checked={config.rain} onChange={(e) => setConfig({ ...config, rain: e.target.checked })} /> Raining (Rainy Day Cravings after 4 PM)</label>
        <label className="flex items-center gap-2 text-ink"><input type="checkbox" checked={config.festival.active} onChange={(e) => setConfig({ ...config, festival: { ...config.festival, active: e.target.checked } })} /> Festival</label>
        <input type="date" className={field} value={config.festival.from ?? ''} onChange={(e) => setConfig({ ...config, festival: { ...config.festival, from: e.target.value || null } })} aria-label="Festival from" />
        <input type="date" className={field} value={config.festival.to ?? ''} onChange={(e) => setConfig({ ...config, festival: { ...config.festival, to: e.target.value || null } })} aria-label="Festival to" />
        <button type="button" onClick={() => void save()} disabled={saving} className="ml-auto rounded-[10px] bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Preview</h2>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <input type="date" className={field} value={preview.date} onChange={(e) => setPreview({ ...preview, date: e.target.value })} />
          <input type="time" className={field} value={preview.time} onChange={(e) => setPreview({ ...preview, time: e.target.value })} />
          <select className={field} value={preview.user} onChange={(e) => setPreview({ ...preview, user: e.target.value as SampleUser })}>
            <option value="regular">Regular customer</option><option value="new">New customer</option><option value="guest">Guest</option>
          </select>
          <select className={field} value={preview.data} onChange={(e) => setPreview({ ...preview, data: e.target.value as 'full' | 'limited' })}>
            <option value="full">All data available</option><option value="limited">Little data (backups)</option>
          </select>
          <select className={field} value={preview.width} onChange={(e) => setPreview({ ...preview, width: Number(e.target.value) })}>
            <option value={360}>360 px phone</option><option value={390}>390 px phone</option><option value={430}>430 px phone</option>
          </select>
          {grid && <span className="text-muted">slot: {grid.slot} · {grid.cards.length} cards</span>}
        </div>
        {grid ? <div className="inline-block rounded-[28px] border border-border p-2"><GridPreview grid={grid} screenWidth={preview.width} /></div>
          : <p className="text-xs text-muted">Pick a valid date and time.</p>}
      </div>

      <div className="card p-5"><h2 className="mb-3 text-sm font-semibold text-ink">Slots (IST) and backups</h2><SlotsEditor config={config} onChange={setConfig} /></div>
      <div className="card p-5"><h2 className="mb-3 text-sm font-semibold text-ink">Cards</h2><CardsEditor config={config} onChange={setConfig} /></div>
      <div className="card p-5"><h2 className="mb-3 text-sm font-semibold text-ink">Today’s fresh inputs</h2><FreshInputs /></div>
    </div>
  );
}
