'use client';

// Time slots tab: six IST slots, each with its hero version and up to 4
// cards (drag to reorder), plus the backup order. The server rejects gaps,
// overlaps, duplicates and disabled cards (same validateConfig).
import { CARD_IDS, DEFAULT_CONFIG, HERO_IDS, ITEM_FACTS, type CardId, type TodayGridConfig } from '@/lib/home/todayGrid';
import { DragList } from './DragList';

const select = 'rounded-lg border border-border bg-canvas px-2 py-1 text-xs text-ink';
const clock = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const minutes = (v: string) => { const [h, m] = v.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h! * 60 + m! : null; };

export function SlotsTab({ config, onChange, errorFor }: { config: TodayGridConfig; onChange: (next: TodayGridConfig) => void; errorFor: (path: string) => { message: string }[] }) {
  const placeable = CARD_IDS.filter((id) => ITEM_FACTS[id].type === 'rotating' && config.items[id].enabled);
  const setSlot = (index: number, patch: Partial<TodayGridConfig['slots'][number]>) =>
    onChange({ ...config, slots: config.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) });
  const title = (id: CardId) => config.items[id].title;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Slots are India time and must cover all 24 hours. Later modifiers can swap positions 3–4 (see Modifiers).</p>
        <button type="button" onClick={() => onChange({ ...config, slots: DEFAULT_CONFIG.slots, backups: DEFAULT_CONFIG.backups })}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas">Reset to recommended</button>
      </div>
      {errorFor('slots').filter((e) => !/^slots\.\d/.test(e.message)).map((e) => <p key={e.message} className="text-xs text-danger">{e.message}</p>)}
      {config.slots.map((slot, index) => (
        <div key={slot.key} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="w-24 font-semibold capitalize text-ink">{slot.key.replace('-', ' ')}</span>
            <input type="time" className={select} value={clock(slot.from)} onChange={(e) => { const m = minutes(e.target.value); if (m != null) setSlot(index, { from: m }); }} aria-label={`${slot.key} from`} />
            <span className="text-muted">to</span>
            <input type="time" className={select} value={clock(slot.to)} onChange={(e) => { const m = minutes(e.target.value); if (m != null) setSlot(index, { to: m }); }} aria-label={`${slot.key} to`} />
            <span className="ml-3 text-muted">Hero</span>
            <select className={select} value={slot.hero} onChange={(e) => setSlot(index, { hero: e.target.value as typeof slot.hero })}>
              {HERO_IDS.filter((id) => config.items[id].enabled).map((id) => <option key={id} value={id}>{config.items[id].title}</option>)}
            </select>
          </div>
          <DragList label={`${slot.key} cards`} items={slot.cards} onChange={(cards) => setSlot(index, { cards })}
            onRemove={(i) => setSlot(index, { cards: slot.cards.filter((_, j) => j !== i) })} render={(id) => title(id)} />
          {slot.cards.length < 4 && (
            <select className={`${select} mt-2`} value="" onChange={(e) => setSlot(index, { cards: [...slot.cards, e.target.value as CardId] })} aria-label={`Add card to ${slot.key}`}>
              <option value="">+ Add card</option>
              {placeable.filter((id) => !slot.cards.includes(id)).map((id) => <option key={id} value={id}>{title(id)}</option>)}
            </select>
          )}
          {errorFor(`slots.${index}`).map((e) => <p key={e.message} className="mt-1 text-xs text-danger">{e.message}</p>)}
        </div>
      ))}
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-semibold text-ink">Backups (tried in this order when a card has no live data)</p>
        <DragList label="Backups" items={config.backups} onChange={(backups) => onChange({ ...config, backups })}
          onRemove={(i) => onChange({ ...config, backups: config.backups.filter((_, j) => j !== i) })} render={(id) => title(id)} />
        <select className={`${select} mt-2`} value="" onChange={(e) => onChange({ ...config, backups: [...config.backups, e.target.value as CardId] })} aria-label="Add backup">
          <option value="">+ Add backup</option>
          {placeable.filter((id) => !config.backups.includes(id)).map((id) => <option key={id} value={id}>{title(id)}</option>)}
        </select>
        {errorFor('backups').map((e) => <p key={e.message} className="mt-1 text-xs text-danger">{e.message}</p>)}
      </div>
    </div>
  );
}
