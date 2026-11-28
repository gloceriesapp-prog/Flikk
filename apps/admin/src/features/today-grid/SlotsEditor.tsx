'use client';

// IST slot table (from–to, four cards each) and the backup order used when a
// card has no live data.
import { CARD_CATALOG, CARD_IDS, fromClock, toClock, type CardId, type TodayGridConfig } from '@/lib/home/todayGrid';

const select = 'rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs text-ink';

function CardSelect({ value, onChange }: { value: CardId | undefined; onChange: (id: CardId) => void }) {
  return (
    <select className={select} value={value ?? ''} onChange={(e) => onChange(e.target.value as CardId)}>
      {CARD_IDS.map((id) => <option key={id} value={id}>{CARD_CATALOG[id].title}</option>)}
    </select>
  );
}

export function SlotsEditor({ config, onChange }: { config: TodayGridConfig; onChange: (next: TodayGridConfig) => void }) {
  const setSlot = (index: number, patch: Partial<TodayGridConfig['slots'][number]>) =>
    onChange({ ...config, slots: config.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {config.slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="w-24 font-medium text-ink">{slot.key}</span>
            <input type="time" className={select} value={toClock(slot.from)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) setSlot(index, { from: m }); }} />
            <span className="text-muted">to</span>
            <input type="time" className={select} value={toClock(slot.to)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) setSlot(index, { to: m }); }} />
            {[0, 1, 2, 3].map((position) => (
              <CardSelect key={position} value={slot.cards[position]}
                onChange={(id) => { const cards = [...slot.cards]; cards[position] = id; setSlot(index, { cards }); }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="w-24 font-medium text-ink">Backups</span>
        {[0, 1, 2, 3].map((position) => (
          <CardSelect key={position} value={config.backups[position]}
            onChange={(id) => { const backups = [...config.backups]; backups[position] = id; onChange({ ...config, backups: [...new Set(backups)] }); }} />
        ))}
        <span className="text-muted">in this order</span>
      </div>
    </div>
  );
}
