'use client';

// Which gateway new online checkouts use. See app/api/payment-gateway/route.ts.
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

type Mode = 'razorpay' | 'cashfree' | 'split';
interface Gateway {
  mode: Mode;
  splitPercent: number;
  last7Days: { razorpay: { started: number; paid: number }; cashfree: { started: number; paid: number }; fallbacks: number };
  history: { id: string; detail: { from?: { payment_gateway?: string; split_pct?: number }; to?: { payment_gateway?: string; split_pct?: number } }; adminEmail: string; createdAt: string }[];
}
const label = (v?: { payment_gateway?: string; split_pct?: number }) =>
  !v ? '' : v.payment_gateway === 'split' ? `split ${v.split_pct ?? 0}% Cashfree` : v.payment_gateway ?? '';

export function PaymentGatewayCard() {
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [draft, setDraft] = useState<{ mode: Mode; pct: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-gateway');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load the payment gateway.');
      setGateway(body);
      setDraft({ mode: body.mode, pct: String(body.splitPercent) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the payment gateway.');
    }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  async function save() {
    if (!draft) return;
    const pct = draft.mode === 'split' ? Number(draft.pct) : 0;
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) { setError('Split must be a whole number from 0 to 100.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/payment-gateway', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: draft.mode, splitPercent: pct }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save the payment gateway.');
      toast.success('Payment gateway saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the payment gateway.');
    } finally { setSaving(false); }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-ink">Payment gateway</h2>
      <p className="mb-3 text-xs text-muted">For new online checkouts only. A checkout keeps the gateway it started on, and refunds always go back through the gateway that took the money. Older app builds always use Razorpay.</p>
      {error && <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      {!gateway || !draft ? (!error && <p className="text-sm text-muted">Loading…</p>) : (
        <>
          <div className="flex flex-col gap-2">
            {(['razorpay', 'cashfree', 'split'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="radio" name="gateway" checked={draft.mode === mode} onChange={() => setDraft({ ...draft, mode })} className="h-4 w-4" />
                {mode === 'razorpay' ? 'Razorpay' : mode === 'cashfree' ? 'Cashfree' : 'Split'}
              </label>
            ))}
            {draft.mode === 'split' && (
              <label className="ml-6 flex items-center gap-2 text-sm text-ink">
                <input type="number" min={0} max={100} step={1} value={draft.pct} onChange={(e) => setDraft({ ...draft, pct: e.target.value })}
                  className="w-20 rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-sm" />
                % of new checkouts to Cashfree
              </label>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Last 7 days: Razorpay {gateway.last7Days.razorpay.paid}/{gateway.last7Days.razorpay.started} paid · Cashfree {gateway.last7Days.cashfree.paid}/{gateway.last7Days.cashfree.started} paid · {gateway.last7Days.fallbacks} fell back to Razorpay
          </p>
          <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 rounded-[10px] bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-brand-strong">
            {saving ? 'Saving…' : 'Save gateway'}
          </button>
          {gateway.history.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1">
              {gateway.history.map((h) => (
                <li key={h.id} className="text-xs text-muted">{new Date(h.createdAt).toLocaleString('en-IN')} · {h.adminEmail} · {label(h.detail.from)} → {label(h.detail.to)}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
