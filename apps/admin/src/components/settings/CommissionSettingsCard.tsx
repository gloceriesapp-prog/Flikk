'use client';

// Commission by product category (app/api/commission-rates). Each item in an
// order is charged its category's rate; a blank rate means the category pays
// the default. The cap limits one store order's commission in rupees. A
// store's own rate (Stores → store) replaces all of these for that store.

import { useEffect, useState } from 'react';
import type { CommissionSettings } from '@/lib/commissionRates';

interface Draft {
  defaultRate: string;
  capPerOrder: string;
  categories: { category: string; rate: string }[];
}

const toPercent = (rate: number | null) => (rate === null ? '' : String(Math.round(rate * 10000) / 100));

function toDraft(settings: CommissionSettings): Draft {
  return {
    defaultRate: toPercent(settings.defaultRate),
    capPerOrder: settings.capPerOrder === null ? '' : String(settings.capPerOrder),
    categories: settings.categories.map((row) => ({ category: row.category, rate: toPercent(row.commissionRate) })),
  };
}

function PercentInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder?: string; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
      />
      <span className="text-sm text-muted">%</span>
    </div>
  );
}

export function CommissionSettingsCard() {
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/commission-rates')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Could not load commission rates.');
        const next = toDraft(body as CommissionSettings);
        setSaved(next);
        setDraft(next);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load commission rates.'));
  }, []);

  const isDirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    if (!draft || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const percent = (value: string) => (value.trim() === '' ? null : Number(value) / 100);
      const res = await fetch('/api/commission-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultRate: percent(draft.defaultRate),
          capPerOrder: draft.capPerOrder.trim() === '' ? null : Number(draft.capPerOrder),
          categories: draft.categories.map((row) => ({ category: row.category, commissionRate: percent(row.rate) })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save commission rates.');
      const next = toDraft(body as CommissionSettings);
      setSaved(next);
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save commission rates.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-ink">Commission by category</h3>
      <p className="mb-4 text-xs text-muted">
        Each item in an order is charged its category&apos;s rate on the item price. Leave a rate blank to use the default.
        A store with its own rate (Stores → store) pays that rate on everything instead. Applies from the next order.
      </p>

      {!draft ? (
        <p className="text-sm text-muted">{error ?? 'Loading…'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {draft.categories.map((row, index) => (
              <div key={row.category} className="flex items-center justify-between gap-4 px-4 py-2">
                <p className="text-sm text-ink">{row.category}</p>
                <PercentInput
                  label={`${row.category} commission`}
                  value={row.rate}
                  placeholder={draft.defaultRate || 'Default'}
                  onChange={(value) => setDraft({ ...draft, categories: draft.categories.map((r, i) => (i === index ? { ...r, rate: value } : r)) })}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Default rate</p>
              <p className="text-xs text-muted">For a category with no rate of its own.</p>
            </div>
            <PercentInput label="Default commission" value={draft.defaultRate} onChange={(value) => setDraft({ ...draft, defaultRate: value })} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Maximum per order</p>
              <p className="text-xs text-muted">The most commission one store order can be charged. Leave blank for no limit.</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
              <span className="text-sm text-muted">₹</span>
              <input
                type="number"
                min={0}
                step={1}
                aria-label="Maximum commission per order"
                value={draft.capPerOrder}
                placeholder="No limit"
                onChange={(e) => setDraft({ ...draft, capPerOrder: e.target.value })}
                className="w-20 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {isDirty && !isSaving && <span className="text-xs text-muted">Unsaved changes</span>}
            <button
              type="button"
              disabled={!isDirty || isSaving}
              onClick={save}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
