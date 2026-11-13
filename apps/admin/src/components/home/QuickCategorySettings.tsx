'use client';

import { useState } from 'react';
import type { HomeTab } from '@/lib/types';

type Option = { id: string; label: string };
const INPUT = 'rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink';

/** Presentation settings belong to the shortcut, not the catalogue taxonomy. */
export function QuickCategorySettings({ tab, categories, subcategories, onSaved }: {
  tab: HomeTab;
  categories: Option[];
  subcategories: Option[];
  onSaved: (tab: HomeTab) => void;
}) {
  const [visibility, setVisibility] = useState(tab.showInQuickCategories == null ? 'inherit' : String(tab.showInQuickCategories));
  const [order, setOrder] = useState(tab.quickSortOrder?.toString() ?? '');
  const [destination, setDestination] = useState(tab.quickCategoryId ? `category:${tab.quickCategoryId}` : tab.quickSubcategoryId ? `subcategory:${tab.quickSubcategoryId}` : 'tab');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const [type, id] = destination.split(':');
      const position = order.trim() ? Number(order) : null;
      if (position != null && (!Number.isInteger(position) || position < 0 || position > 9999)) throw new Error('Order must be a whole number from 0 to 9999.');
      const response = await fetch(`/api/home-tabs/${tab.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tab.name, sortOrder: tab.sortOrder, isActive: tab.isActive,
          showInQuickCategories: visibility === 'inherit' ? null : visibility === 'true',
          quickSortOrder: position,
          quickCategoryId: type === 'category' ? id : null,
          quickSubcategoryId: type === 'subcategory' ? id : null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not save Quick category.');
      onSaved(body as HomeTab); setMessage('Quick category saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save Quick category.'); }
    finally { setBusy(false); }
  }

  return <section className="mb-5 rounded-2xl border border-border bg-[#F9FAFB] p-4" aria-labelledby="quick-category-settings">
    <h2 id="quick-category-settings" className="text-sm font-semibold text-ink">Home Quick category</h2>
    <p className="mb-4 mt-1 text-xs text-muted">Uses this category’s name and card image above. Choose its visibility, order and destination without changing catalogue products.</p>
    <fieldset disabled={busy} className="grid gap-3 disabled:opacity-60 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink">Show in Quick categories
        <select value={visibility} onChange={event => setVisibility(event.target.value)} className={INPUT}>
          <option value="inherit">Use existing visibility</option><option value="true">Show</option><option value="false">Hide</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink">Display order
        <input type="number" min={0} max={9999} step={1} value={order} placeholder="Same as Home tab order" onChange={event => setOrder(event.target.value)} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink sm:col-span-2">When the customer taps this card
        <select value={destination} onChange={event => setDestination(event.target.value)} className={INPUT}>
          <option value="tab">Open this Home category — configure its section and tiles below</option>
          <optgroup label="Existing catalogue categories">{categories.map(option => <option key={option.id} value={`category:${option.id}`}>{option.label}</option>)}</optgroup>
          <optgroup label="Existing subcategories">{subcategories.map(option => <option key={option.id} value={`subcategory:${option.id}`}>{option.label}</option>)}</optgroup>
        </select>
      </label>
      <button type="button" onClick={() => void save()} className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white sm:col-span-2">{busy ? 'Saving…' : 'Save Quick category'}</button>
    </fieldset>
    <p className="mt-3 text-xs text-muted">Lower order numbers appear first. Hidden shortcuts leave their catalogue category available elsewhere. For a custom collection, add a Home category on the left, upload its image, then select a section or add category tiles below.</p>
    {!tab.isActive && <p className="mt-2 text-xs text-muted">This Home category is inactive. Activate it to make its shortcut available.</p>}
    {message && <p role="status" className="mt-2 text-sm text-success">{message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
  </section>;
}
