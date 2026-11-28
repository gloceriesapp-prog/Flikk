'use client';

// Today on Gloceries — admin for the "Today on Gloceries" Home grid. Edits save as a
// draft version; Publish makes one version live. Rules and validation come
// from packages/today-grid, the same engine the customer endpoint runs.
import { useState } from 'react';
import { CardsTab } from '@/features/today-grid/CardsTab';
import { HeaderImageCard } from '@/features/today-grid/HeaderImageCard';
import { ModifiersTab } from '@/features/today-grid/ModifiersTab';
import { SlotsTab } from '@/features/today-grid/SlotsTab';
import { VersionsPanel } from '@/features/today-grid/VersionsPanel';
import { useTodayGridDraft } from '@/features/today-grid/useTodayGridDraft';

const TABS = [
  { key: 'cards', label: 'Cards' }, { key: 'slots', label: 'Time slots' }, { key: 'modifiers', label: 'Modifiers' },
  { key: 'daily', label: 'Daily inputs', soon: true }, { key: 'preview', label: 'Preview', soon: true }, { key: 'performance', label: 'Performance', soon: true },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function TodayGridPage() {
  const grid = useTodayGridDraft();
  const [tab, setTab] = useState<TabKey>('cards');
  const [showVersions, setShowVersions] = useState(false);
  const { loaded, config } = grid;
  // The header image lives in App content, so it can be set even when the
  // grid settings can't load (e.g. its tables aren't on this database yet).
  if (!config || !loaded) return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Today on Gloceries</h1>
      <HeaderImageCard />
      {grid.error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{grid.error} Cards, slots and modifiers need the grid tables on this database.</p> : <p className="text-sm text-muted">Loading…</p>}
    </div>
  );
  const status = grid.dirty ? 'Unsaved changes' : !loaded.draft ? 'Recommended defaults (not saved yet)'
    : grid.draftIsLive ? `Live: version ${loaded.draft.id}` : `Draft v${loaded.draft.id} · live v${loaded.publishedVersionId ?? '—'}`;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="page-title">Today on Gloceries</h1>
          <p className="text-sm text-muted">“Today on Gloceries” on customer Home: a fresh hero and four cards that change through the day.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={loaded.enabled} disabled={grid.busy} onChange={(e) => void grid.setEnabled(e.target.checked)} /> Show on Home</label>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${grid.dirty ? 'bg-amber-50 text-amber-700' : grid.draftIsLive ? 'bg-success/10 text-success' : 'bg-canvas text-muted'}`}>{status}</span>
        <button type="button" onClick={() => setShowVersions(!showVersions)} className="rounded-[10px] border border-border px-3 py-2 text-sm font-medium text-ink">Versions</button>
        <button type="button" disabled={grid.busy || !grid.dirty} onClick={() => void grid.saveDraft()} className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-ink disabled:opacity-40">Save draft</button>
        <button type="button" disabled={grid.busy || grid.draftIsLive} onClick={() => void grid.publish()} className="rounded-[10px] bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Publish</button>
      </div>
      {grid.error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{grid.error}</p>}
      <HeaderImageCard />
      {showVersions && <div className="card p-4"><VersionsPanel versions={loaded.versions} busy={grid.busy} onRestore={(id) => void grid.restore(id)} /></div>}
      <div role="tablist" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} disabled={'soon' in t}
            onClick={() => setTab(t.key)} title={'soon' in t ? 'Coming in a later update' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? 'border-brand text-ink' : 'border-transparent text-muted'} disabled:opacity-40`}>{t.label}</button>
        ))}
      </div>
      <div className="card p-5">
        {tab === 'cards' && <CardsTab config={config} onChange={grid.update} errorFor={grid.errorFor} />}
        {tab === 'slots' && <SlotsTab config={config} onChange={grid.update} errorFor={grid.errorFor} />}
        {tab === 'modifiers' && <ModifiersTab config={config} onChange={grid.update} errorFor={grid.errorFor} />}
      </div>
    </div>
  );
}
