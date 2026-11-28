'use client';

// Cards tab: every hero version and card with its live config. Editing
// happens in CardEditModal; changes stay in the draft until saved/published.
import { useState } from 'react';
import { ITEM_FACTS, ITEM_IDS, imageSlotsFor, type ItemId, type TodayGridConfig } from '@/lib/home/todayGrid';
import { CardEditModal } from './CardEditModal';
import { opensLabel, targetLabel } from './targetLabel';

const TYPE_BADGE: Record<string, string> = { hero: 'bg-amber-50 text-amber-700', rotating: 'bg-blue-50 text-blue-700', special: 'bg-purple-50 text-purple-700' };

export function CardsTab({ config, onChange, errorFor }: { config: TodayGridConfig; onChange: (next: TodayGridConfig) => void; errorFor: (path: string) => { message: string }[] }) {
  const [editing, setEditing] = useState<ItemId | null>(null);
  const toggle = (id: ItemId) => onChange({ ...config, items: { ...config.items, [id]: { ...config.items[id], enabled: !config.items[id].enabled } } });
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted"><tr><th className="py-2 pr-3">Card</th><th className="pr-3">Type</th><th className="pr-3">On</th><th className="pr-3">Accent</th><th className="pr-3">Tap opens</th><th className="pr-3">Data rule</th><th className="pr-3">Last edited</th><th /></tr></thead>
          <tbody>
            {ITEM_IDS.map((id) => {
              const item = config.items[id], facts = ITEM_FACTS[id], issues = errorFor(`items.${id}`);
              return (
                <tr key={id} className="border-t border-border align-top">
                  <td className="py-2.5 pr-3"><p className="font-semibold text-ink">{item.title}</p><p className="text-muted">{item.tag} · {item.line}</p>
                    {issues.map((e) => <p key={e.message} className="text-danger">{e.message}</p>)}</td>
                  <td className="pr-3"><span className={`rounded-full px-2 py-0.5 font-medium ${TYPE_BADGE[facts.type]}`}>{facts.type}</span></td>
                  <td className="pr-3"><input type="checkbox" checked={item.enabled} disabled={id === 'fruits-vegetables'} onChange={() => toggle(id)} aria-label={`${item.title} enabled`}
                    title={id === 'fruits-vegetables' ? 'The fallback hero is always on' : undefined} /></td>
                  <td className="pr-3"><span className="inline-flex h-5 w-8 items-center justify-center rounded text-[10px] font-bold" style={{ background: item.accent, color: item.tagText }}>Aa</span></td>
                  <td className="pr-3 text-ink">{opensLabel(item)}<p className="text-muted">{targetLabel(item.target, item.categories)}</p><p className="text-muted">Photos: {item.images.mode === 'picked' ? `${item.images.productIds.length}/${imageSlotsFor(id)} picked` : `auto (${imageSlotsFor(id)})`}</p></td>
                  <td className="max-w-[220px] pr-3 text-muted">{facts.rule}</td>
                  <td className="pr-3 text-muted">{item.updatedAt ? `${item.updatedBy ?? ''} · ${new Date(item.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : '—'}</td>
                  <td><button type="button" onClick={() => setEditing(id)} className="rounded-lg border border-border px-2.5 py-1 font-medium text-ink hover:bg-canvas">Edit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <CardEditModal id={editing} item={config.items[editing]} onClose={() => setEditing(null)}
        onApply={(item) => { onChange({ ...config, items: { ...config.items, [editing]: item } }); setEditing(null); }} />}
    </>
  );
}
