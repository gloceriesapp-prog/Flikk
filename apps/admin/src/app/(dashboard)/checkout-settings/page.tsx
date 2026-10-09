'use client';

// Checkout settings: which payment methods customers can use and the
// platform-wide minimum order value. Backed by platform_settings (migration
// 117) via app/api/checkout-settings/route.ts; the backend reads the row on
// every checkout, so a save applies to the next order. The backend env stays
// a hard kill: online payment also needs Cashfree keys on the server.

import { useCallback, useEffect, useState } from 'react';

const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

interface HistoryRow {
  id: string;
  detail: { from?: Record<string, unknown>; to?: Record<string, unknown> };
  adminEmail: string;
  createdAt: string;
}

interface Settings {
  codEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  minOrderValue: number;
  history: HistoryRow[];
}

function describe(values: Record<string, unknown> | undefined): string {
  if (!values) return '';
  return [
    `COD ${values.cod_enabled ? 'on' : 'off'}`,
    `online ${values.online_payments_enabled ? 'on' : 'off'}`,
    `minimum ₹${Number(values.min_order_value ?? 0)}`,
  ].join(', ');
}

export default function CheckoutSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<{ cod: boolean; online: boolean; min: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/checkout-settings');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load checkout settings.');
      setSettings(body);
      setDraft({ cod: body.codEnabled, online: body.onlinePaymentsEnabled, min: String(body.minOrderValue) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load checkout settings.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function save() {
    if (!draft) return;
    const min = Number(draft.min);
    if (draft.min.trim() === '' || !Number.isFinite(min) || min < 0) {
      setError('Enter a minimum order value of 0 or more (0 = no minimum).');
      return;
    }
    if (!draft.cod && !draft.online) {
      setError('Keep at least one payment method on.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/checkout-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codEnabled: draft.cod, onlinePaymentsEnabled: draft.online, minOrderValue: min }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save checkout settings.');
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save checkout settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Checkout settings</h1>
        <p className="text-sm text-muted">Payment methods customers can choose and the minimum order value. Changes apply to the next checkout.</p>
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {!settings || !draft ? (
        !error && <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Payment methods</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={draft.cod} onChange={(e) => setDraft({ ...draft, cod: e.target.checked })} className="h-4 w-4 rounded border-border" />
                Cash on delivery
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={draft.online} onChange={(e) => setDraft({ ...draft, online: e.target.checked })} className="h-4 w-4 rounded border-border" />
                Online payment (UPI, cards, netbanking)
              </label>
              <p className="text-xs text-muted">
                A switched-off method disappears from the customer app and new orders with it are refused. Payments already started still settle and refund normally.
                Online payment also needs the Cashfree keys on the server; the server can force either method off with COD_DISABLED / ONLINE_PAYMENTS_DISABLED.
              </p>
            </div>
            <h2 className="mb-3 mt-6 text-sm font-semibold text-ink">Minimum order value</h2>
            <div className="max-w-xs">
              <label htmlFor="min-order" className="mb-1.5 block text-xs font-medium text-muted">Item subtotal in ₹, before delivery fee and coupons (0 = no minimum)</label>
              <input id="min-order" type="number" min={0} step="0.01" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} className={inputClass} />
            </div>
            <p className="mt-2 text-xs text-muted">The customer cart shows how much more to add, and the server refuses orders below it.</p>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && !saving && <span role="status" className="text-xs text-green-700">Saved.</span>}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Recent changes</h2>
            {settings.history.length === 0 ? (
              <p className="text-sm text-muted">No changes recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {settings.history.map((h) => (
                  <li key={h.id} className="text-xs text-muted">
                    {new Date(h.createdAt).toLocaleString('en-IN')} · {h.adminEmail} · {describe(h.detail.from)} → {describe(h.detail.to)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
