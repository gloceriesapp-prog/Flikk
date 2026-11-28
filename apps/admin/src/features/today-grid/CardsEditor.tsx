'use client';

// Per-card overrides: enabled, title, line, accent, target category list.
// Empty fields fall back to the catalogue defaults.
import { CARD_CATALOG, CARD_IDS, type CardId, type TodayGridConfig } from '@/lib/home/todayGrid';

const input = 'w-full rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs text-ink';

export function CardsEditor({ config, onChange }: { config: TodayGridConfig; onChange: (next: TodayGridConfig) => void }) {
  const set = (id: CardId, patch: Record<string, unknown>) => {
    const merged = { ...config.cards[id], ...patch };
    for (const key of Object.keys(merged) as (keyof typeof merged)[]) if (merged[key] === '' || merged[key] === undefined) delete merged[key];
    onChange({ ...config, cards: { ...config.cards, [id]: merged } });
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-muted"><tr><th className="py-2">On</th><th>Card</th><th>Title</th><th>Line</th><th>Accent</th><th>Categories (comma separated)</th></tr></thead>
        <tbody>
          {CARD_IDS.map((id) => {
            const base = CARD_CATALOG[id];
            const o = config.cards[id] ?? {};
            return (
              <tr key={id} className="border-t border-border align-top">
                <td className="py-2 pr-2"><input type="checkbox" checked={o.enabled !== false} onChange={(e) => set(id, { enabled: e.target.checked ? undefined : false })} aria-label={`${base.title} on`} /></td>
                <td className="py-2 pr-2">
                  <span className="mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: o.accent ?? base.accent }} />
                  <span className="font-medium text-ink">{base.title}</span>
                  <p className="text-[10px] text-muted">{base.check.kind === 'categories' ? `needs ≥${base.check.min} in stock` : base.check.kind}</p>
                </td>
                <td className="py-2 pr-2"><input className={input} placeholder={base.title} value={o.title ?? ''} maxLength={40} onChange={(e) => set(id, { title: e.target.value })} /></td>
                <td className="py-2 pr-2"><input className={input} placeholder={base.line} value={o.line ?? ''} maxLength={80} onChange={(e) => set(id, { line: e.target.value })} /></td>
                <td className="py-2 pr-2"><input className={`${input} w-24`} placeholder={base.accent} value={o.accent ?? ''} onChange={(e) => set(id, { accent: e.target.value })} /></td>
                <td className="py-2">
                  {base.categories.length || o.categories ? (
                    <input className={input} placeholder={base.categories.join(', ')} value={(o.categories ?? []).join(', ')}
                      onChange={(e) => set(id, { categories: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined })} />
                  ) : <span className="text-muted">Live data</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
