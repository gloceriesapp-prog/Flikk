'use client';

// Modifiers, shown in the order the engine applies them (later ones win when
// two want the same position). The festival itself is NOT stored here: the
// active festival comes from Festival greeting, the one festival source.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CARD_IDS, ITEM_FACTS, type CardId, type ConfigError, type TodayGridConfig } from '@/lib/home/todayGrid';

const select = 'rounded-lg border border-border bg-canvas px-2 py-1 text-xs text-ink';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const minutes = (v: string) => { const [h, m] = v.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h! * 60 + m! : null; };
// "On until 22:00" -> the next 22:00 India time as an instant.
export function untilInstant(time: string, now = new Date()): string {
  const today = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  let at = Date.parse(`${today}T${time}:00+05:30`);
  if (at <= now.getTime()) at += 86_400_000;
  return new Date(at).toISOString();
}

function CardSelect({ config, cards, value, onPick }: { config: TodayGridConfig; cards: CardId[]; value: CardId; onPick: (id: CardId) => void }) {
  return <select className={select} value={value} onChange={(e) => onPick(e.target.value as CardId)}>{cards.map((id) => <option key={id} value={id}>{config.items[id].title}{ITEM_FACTS[id].type === 'special' ? ' (special)' : ''}</option>)}</select>;
}
function Position({ value, onPick }: { value: number; onPick: (p: number) => void }) {
  return <select className={select} value={value} onChange={(e) => onPick(Number(e.target.value))}>{[1, 2, 3, 4].map((p) => <option key={p} value={p}>position {p}</option>)}</select>;
}

function Row({ step, title, on, onToggle, children }: { step: number; title: string; on: boolean; onToggle?: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-canvas text-[11px] font-bold text-ink">{step}</span>
        <span className="text-sm font-semibold text-ink">{title}</span>
        {onToggle && <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} /> On</label>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink">{children}</div>
    </div>
  );
}

export function ModifiersTab({ config, onChange, errorFor }: { config: TodayGridConfig; onChange: (next: TodayGridConfig) => void; errorFor: (path: string) => ConfigError[] }) {
  const m = config.modifiers;
  const set = <K extends keyof typeof m>(key: K, patch: Partial<(typeof m)[K]>) => onChange({ ...config, modifiers: { ...m, [key]: { ...m[key], ...patch } } });
  const [festival, setFestival] = useState<{ is_active?: boolean; tab_title?: string | null; title?: string | null } | null | undefined>(undefined);
  useEffect(() => { void fetch('/api/festival-greeting').then((r) => (r.ok ? r.json() : null)).then(setFestival, () => setFestival(null)); }, []);
  const festivalName = festival?.is_active ? festival.tab_title?.trim() || festival.title?.trim().replace(/^happy\s+/i, '') || null : null;
  const cards = CARD_IDS.filter((id) => config.items[id].enabled);
  const rainUntil = m.rain.until ? new Date(m.rain.until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : '22:00';
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">Applied top to bottom; when two want the same position, the later one wins.</p>
      <Row step={1} title="Month start" on={m.monthStart.on} onToggle={(on) => set('monthStart', { on })}>
        Days <input type="number" min={1} max={31} className={`${select} w-14`} value={m.monthStart.fromDay} onChange={(e) => set('monthStart', { fromDay: Number(e.target.value) })} />
        to <input type="number" min={1} max={31} className={`${select} w-14`} value={m.monthStart.toDay} onChange={(e) => set('monthStart', { toDay: Number(e.target.value) })} />
        · card <CardSelect config={config} cards={cards} value={m.monthStart.card} onPick={(card) => set('monthStart', { card })} /> at <Position value={m.monthStart.position} onPick={(position) => set('monthStart', { position })} />
      </Row>
      <Row step={2} title="Weekend party" on={m.weekendParty.on} onToggle={(on) => set('weekendParty', { on })}>
        {DAYS.map((d, i) => (
          <label key={d} className="flex items-center gap-0.5"><input type="checkbox" checked={m.weekendParty.days.includes(i)}
            onChange={(e) => set('weekendParty', { days: e.target.checked ? [...m.weekendParty.days, i].sort() : m.weekendParty.days.filter((x) => x !== i) })} />{d}</label>
        ))}
        · from <input type="time" className={select} value={clock(m.weekendParty.fromMinute)} onChange={(e) => { const v = minutes(e.target.value); if (v != null) set('weekendParty', { fromMinute: v }); }} />
        · card <CardSelect config={config} cards={cards} value={m.weekendParty.card} onPick={(card) => set('weekendParty', { card })} /> at <Position value={m.weekendParty.position} onPick={(position) => set('weekendParty', { position })} />
      </Row>
      <Row step={3} title="Festival" on={m.festival.on} onToggle={(on) => set('festival', { on })}>
        <span className={festivalName ? 'rounded bg-success/10 px-2 py-0.5 text-success' : 'rounded bg-canvas px-2 py-0.5 text-muted'}>
          {festival === undefined ? 'Reading festival…' : festivalName ? `Active festival: ${festivalName}` : 'No festival active'}
        </span>
        <Link href="/festival-greeting" className="text-brand underline">Edit festival</Link>
        · title <input className={`${select} w-40`} value={m.festival.titleTemplate} onChange={(e) => set('festival', { titleTemplate: e.target.value })} />
        <span className="text-muted">→ “{m.festival.titleTemplate.replace('{festival}', festivalName ?? 'Deepavali')}”</span>
        · at <Position value={m.festival.position} onPick={(position) => set('festival', { position })} />
        <label className="flex w-full flex-col gap-1">Target categories (comma separated)
          <input className={`${select} w-full`} value={m.festival.categories.join(', ')} onChange={(e) => set('festival', { categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></label>
        {errorFor('modifiers.festival').map((e) => <p key={e.message} className="w-full text-danger">{e.message}</p>)}
      </Row>
      <Row step={4} title="Rain" on={m.rain.on} onToggle={(on) => set('rain', { on, until: on ? untilInstant(rainUntil) : null })}>
        {/* TODO(weather): hook a weather API here to switch rain on/off automatically. Manual only for now. */}
        On until <input type="time" className={select} value={rainUntil} onChange={(e) => set('rain', { until: untilInstant(e.target.value) })} disabled={!m.rain.on} />
        <span className="text-muted">(switches itself off then)</span>
        · from <input type="time" className={select} value={clock(m.rain.fromMinute)} onChange={(e) => { const v = minutes(e.target.value); if (v != null) set('rain', { fromMinute: v }); }} />
        · card <CardSelect config={config} cards={cards} value={m.rain.card} onPick={(card) => set('rain', { card })} /> at <Position value={m.rain.position} onPick={(position) => set('rain', { position })} />
      </Row>
      <Row step={5} title="New customers" on>
        Customers with fewer than <input type="number" min={0} max={20} className={`${select} w-14`} value={m.newUsers.threshold} onChange={(e) => set('newUsers', { threshold: Number(e.target.value) })} />
        delivered orders see Popular Near You instead of Your Usuals.
      </Row>
      {errorFor('modifiers').filter((e) => !e.path.startsWith('modifiers.festival')).map((e) => <p key={e.message} className="text-xs text-danger">{e.message}</p>)}
    </div>
  );
}
