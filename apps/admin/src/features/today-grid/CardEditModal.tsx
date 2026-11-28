'use client';

// Edit one card or hero version. Errors come from the shared validateConfig
// (the same check the server runs on save), so what passes here passes there.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/components/icons';
import { ProductPinPicker } from '@/components/home/ProductPinPicker';
import { fetchCategories } from '@/lib/supabase/categories';
import { fetchAllSubCategoryOptions, type SubCategoryOption } from '@/lib/supabase/subcategories';
import {
  ACCENT_PRESETS, contrastRatio, fill, ITEM_FACTS, MIN_TAG_CONTRAST, validateConfig,
  type CardTarget, type ConfigError, type ItemConfig, type ItemId,
} from '@/lib/home/todayGrid';
import type { Product } from '@/lib/types';
import { MiniCard } from './MiniCard';
import { ACTION_LABELS } from './targetLabel';

const field = 'w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink';
const SAMPLE = { min: '25', pct: '20', total: '6', time: '6:40 AM', cutoff: '4 AM', festival: 'Deepavali' };

function FieldErrors({ errors }: { errors: ConfigError[] }) {
  return <>{errors.map((e) => <p key={e.message} className="mt-1 text-xs text-danger">{e.message}{e.suggestion ? ` Try: ${e.suggestion}.` : ''}</p>)}</>;
}
function Count({ value, max }: { value: string; max: number }) {
  return <span className={`text-[10px] ${value.length > max ? 'text-danger' : 'text-muted'}`}>{value.length}/{max}</span>;
}

export function CardEditModal({ id, item, onClose, onApply }: { id: ItemId; item: ItemConfig; onClose: () => void; onApply: (item: ItemConfig) => void }) {
  const [draft, setDraft] = useState<ItemConfig>(item);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategoryOption[]>([]);
  const facts = ITEM_FACTS[id];
  const supported = facts.placeholders.filter((p) => p !== 'festival');

  useEffect(() => {
    void fetch('/api/products').then((r) => (r.ok ? r.json() : [])).then((rows: Product[]) => setProducts(rows), () => {});
    void fetchCategories().then((rows) => setCategories(rows.map((c) => c.name)), () => {});
    void fetchAllSubCategoryOptions().then(setSubcategories, () => {});
  }, []);

  const errors = useMemo(() => validateConfig({ items: { [id]: draft } }).errors, [id, draft]);
  const errorFor = (fieldName: string) => errors.filter((e) => e.path === `items.${id}.${fieldName}`);
  const ratio = contrastRatio(draft.accent, draft.tagText);
  const set = (patch: Partial<ItemConfig>) => setDraft({ ...draft, ...patch });
  const setTarget = (target: CardTarget) => set({ target });


  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="card-edit-title" className="card relative flex max-h-[90vh] w-full max-w-3xl animate-rise flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div><h2 id="card-edit-title" className="text-base font-semibold text-ink">{item.title}</h2><p className="text-xs text-muted">{facts.type} · {facts.rule}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-canvas"><X size={18} /></button>
        </div>
        <div className="grid flex-1 gap-6 overflow-y-auto p-5 md:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-4 text-sm">
            <label className="flex flex-col gap-1"><span className="flex justify-between text-xs font-medium text-muted">Title <Count value={draft.title} max={24} /></span>
              <input className={field} value={draft.title} onChange={(e) => set({ title: e.target.value })} /><FieldErrors errors={errorFor('title')} /></label>
            <label className="flex flex-col gap-1"><span className="flex justify-between text-xs font-medium text-muted">{facts.type === 'hero' ? 'Line' : 'Line (screen readers only; small cards show the title)'} <Count value={draft.line} max={40} /></span>
              <input className={field} value={draft.line} onChange={(e) => set({ line: e.target.value })} /><FieldErrors errors={errorFor('line')} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-muted">Tag</span>
                <input className={field} value={draft.tag} onChange={(e) => set({ tag: e.target.value })} />
                <span className="flex flex-wrap gap-1">{supported.length ? supported.map((p) => (
                  <button key={p} type="button" onClick={() => set({ tag: `${draft.tag}{${p}}` })} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink">{`{${p}}`}</button>
                )) : <span className="text-[10px] text-muted">No live numbers for this card</span>}</span><FieldErrors errors={errorFor('tag')} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-muted">Fallback tag (no number)</span>
                <input className={field} value={draft.fallbackTag} onChange={(e) => set({ fallbackTag: e.target.value })} /><FieldErrors errors={errorFor('fallbackTag')} /></label>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Accent (tag + 10% image tint; cards stay white)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {ACCENT_PRESETS.map((hex) => (
                  <button key={hex} type="button" onClick={() => set({ accent: hex })} aria-label={hex} title={hex}
                    className={`h-6 w-6 rounded-full border-2 ${draft.accent.toUpperCase() === hex ? 'border-ink' : 'border-transparent'}`} style={{ background: hex }} />
                ))}
                <input className="w-24 rounded-lg border border-border bg-canvas px-2 py-1 font-mono text-xs" value={draft.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Custom accent" />
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-muted">Tag text</span>
                {(['#FFFFFF', '#FFD84D'] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1"><input type="radio" checked={draft.tagText === c} onChange={() => set({ tagText: c })} />{c === '#FFFFFF' ? 'White' : 'Yellow #FFD84D'}</label>
                ))}
                <span className={ratio >= MIN_TAG_CONTRAST ? 'text-success' : 'font-semibold text-danger'}>{ratio}:1 {ratio >= MIN_TAG_CONTRAST ? 'OK' : `needs ${MIN_TAG_CONTRAST}:1`}</span>
              </div>
              <FieldErrors errors={errorFor('accent')} /><FieldErrors errors={errorFor('tagText')} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Tap opens</p>
              <select className={field} value={draft.target.type === 'action' ? `action:${draft.target.id}` : draft.target.type === 'tab' ? `tab:${draft.target.id}` : draft.target.type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'categories') setTarget({ type: 'categories', categories: draft.categories });
                  else if (v === 'subcategory') setTarget({ type: 'subcategory', id: subcategories[0]?.id ?? '' });
                  else if (v === 'products') setTarget({ type: 'products', productIds: [] });
                  else if (v === 'brands') setTarget({ type: 'brands' });
                  else if (v.startsWith('tab:')) setTarget({ type: 'tab', id: v.slice(4) as 'fresh' });
                  else setTarget({ type: 'action', id: v.slice(7) as 'add-usuals' });
                }}>
                <option value="categories">Categories</option><option value="subcategory">Sub-category</option><option value="products">Pinned products</option>
                <option value="brands">Local brands list</option><option value="tab:fresh">Fresh tab</option><option value="tab:udupi">Udupi tab</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => <option key={key} value={`action:${key}`}>{label}</option>)}
              </select>
              {draft.target.type === 'subcategory' && (
                <select className={`${field} mt-2`} value={draft.target.id} onChange={(e) => setTarget({ type: 'subcategory', id: e.target.value })}>
                  {subcategories.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              )}
              {draft.target.type === 'products' && (
                <div className="mt-2"><ProductPinPicker productIds={draft.target.productIds} products={products} capacity={30} onChange={(ids) => setTarget({ type: 'products', productIds: ids })} /></div>
              )}
              <FieldErrors errors={errorFor('target')} />
            </div>
            {facts.check === 'categories' || facts.check === 'storeOpen' ? (
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-muted">Categories this card counts (data rule)</span>
                <select multiple className={`${field} h-28`} value={draft.categories}
                  onChange={(e) => set({ categories: [...e.target.selectedOptions].map((o) => o.value) })}>
                  {[...new Set([...draft.categories, ...categories])].map((name) => <option key={name} value={name}>{name}</option>)}
                </select></label>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Images</p>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1"><input type="radio" checked={draft.images.mode === 'auto'} onChange={() => set({ images: { mode: 'auto' } })} />Automatic (top 2 in-stock products)</label>
                <label className="flex items-center gap-1"><input type="radio" checked={draft.images.mode === 'picked'} onChange={() => set({ images: { mode: 'picked', productIds: [] } })} />Pick 2 products</label>
              </div>
              {draft.images.mode === 'picked' && (
                <div className="mt-2"><ProductPinPicker productIds={draft.images.productIds} products={products} capacity={2}
                  onChange={(ids) => set({ images: { mode: 'picked', productIds: ids.slice(0, 2) } })} /></div>
              )}
              <FieldErrors errors={errorFor('images')} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-muted">Preview</p>
            <MiniCard hero={facts.type === 'hero'} title={fill(draft.title, SAMPLE) ?? draft.title} tag={fill(draft.tag, SAMPLE) ?? draft.fallbackTag} line={draft.line}
              accent={draft.accent} tagText={draft.tagText} width={facts.type === 'hero' ? 150 : 140} height={facts.type === 'hero' ? 300 : 190}
              price={facts.type === 'hero' ? { amount: 25, mrp: 30 } : undefined} />
            <p className="text-center text-[10px] text-muted">Sample numbers; live values on the phone. Fallback tag: “{draft.fallbackTag}”</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          {errors.length ? <span className="mr-auto text-xs text-danger">{errors.length} issue{errors.length === 1 ? '' : 's'} to fix</span> : null}
          <button type="button" onClick={onClose} className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-ink">Cancel</button>
          <button type="button" disabled={errors.length > 0} onClick={() => onApply(draft)} className="rounded-[10px] bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Apply to draft</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
