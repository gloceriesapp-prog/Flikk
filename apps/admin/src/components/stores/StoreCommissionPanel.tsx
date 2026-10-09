'use client';

// Per-store commission override (stores.commission_rate, migration 115). Empty
// means the store pays the platform default from Settings. Applies to new
// orders only — see app/api/stores/[id]/commission/route.ts.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function toPercent(rate: number): string {
  return String(Math.round(rate * 10000) / 100);
}

export function StoreCommissionPanel({
  storeId,
  storeRate,
  platformRate,
}: {
  storeId: string;
  storeRate: number | null;
  platformRate: number | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(storeRate == null ? '' : toPercent(storeRate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedDraft = storeRate == null ? '' : toPercent(storeRate);
  const dirty = draft.trim() !== savedDraft;

  async function save(value: string) {
    const trimmed = value.trim();
    const percent = Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      setError('Enter a percent between 0 and 100, or leave it empty to use the default.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: trimmed === '' ? null : percent / 100 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save the commission rate.');
      setDraft(trimmed);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the commission rate.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Commission</h2>
          <p className="mt-1 text-sm text-muted">
            {storeRate != null
              ? `This store pays its own rate of ${toPercent(storeRate)}% of the item total.`
              : `This store pays the platform default${platformRate != null ? ` of ${toPercent(platformRate)}%` : ''}.`}{' '}
            Changes apply to new orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={draft}
              placeholder={platformRate != null ? toPercent(platformRate) : 'Default'}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Store commission percent"
              className="w-16 bg-transparent text-right text-sm font-medium text-ink outline-none"
            />
            <span className="text-sm text-muted">%</span>
          </div>
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => void save(draft)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          {storeRate != null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save('')}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40"
            >
              Use default
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
