'use client';

// Promo codes — real, backed by public.promo_codes via
// app/api/promo-codes/route.ts (service role; the table has no public RLS
// policy at all, so every read/write here is the only place a code is
// ever created — POST /promos/validate at checkout only ever looks one
// up). Was DB-only before this page: no admin UI existed to create,
// adjust, or disable a code — a founder had to hand-write SQL.
//
// Deactivate (the toggle) is the real "stop this code" action — delete is
// only offered for a code with zero real redemptions (see [id]/route.ts's
// own note on the FK restrict that makes a redeemed code undeletable).

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { PromoCode } from '@/lib/supabase/promoCodes';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface DraftForm {
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: string;
  maxDiscountAmount: string;
  minOrderValue: string;
  usageLimit: string;
  expiresAt: string;
}

const EMPTY_DRAFT: DraftForm = {
  code: '',
  discountType: 'flat',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderValue: '',
  usageLimit: '',
  expiresAt: '',
};

function formatExpiry(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const loadCodes = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/promo-codes');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load promo codes.');
      setCodes(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load promo codes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadCodes);
  }, [loadCodes]);
  useAdminRealtime(loadCodes);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: draft.code,
          discountType: draft.discountType,
          discountValue: Number(draft.discountValue),
          maxDiscountAmount: draft.maxDiscountAmount ? Number(draft.maxDiscountAmount) : null,
          minOrderValue: draft.minOrderValue ? Number(draft.minOrderValue) : 0,
          usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
          expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not create promo code.');
      setCodes((prev) => [body as PromoCode, ...prev]);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create promo code.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(promo: PromoCode) {
    const res = await fetch(`/api/promo-codes/${promo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscountAmount: promo.maxDiscountAmount,
        minOrderValue: promo.minOrderValue,
        usageLimit: promo.usageLimit,
        expiresAt: promo.expiresAt,
        isActive: !promo.isActive,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setRowError({ id: promo.id, message: body.error ?? 'Could not update.' });
      return;
    }
    setCodes((prev) => prev.map((c) => (c.id === promo.id ? (body as PromoCode) : c)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/promo-codes/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setRowError({ id, message: body?.error ?? 'Could not delete.' });
      return;
    }
    setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Promo codes</h1>
          <p className="text-sm text-muted">{loading ? 'Loading…' : `${codes.length} codes.`}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={15} />
          Add promo code
        </button>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      {adding && (
        <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code">
              <input
                required
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME50"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </Field>

            <Field label="Discount type">
              <select
                value={draft.discountType}
                onChange={(e) => setDraft({ ...draft, discountType: e.target.value as 'flat' | 'percent' })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              >
                <option value="flat">Flat amount (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </Field>

            <Field label={draft.discountType === 'flat' ? 'Discount amount (₹)' : 'Discount percent'}>
              <input
                required
                type="number"
                min={0}
                value={draft.discountValue}
                onChange={(e) => setDraft({ ...draft, discountValue: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </Field>

            {draft.discountType === 'percent' && (
              <Field label="Max discount cap (₹, optional)">
                <input
                  type="number"
                  min={0}
                  value={draft.maxDiscountAmount}
                  onChange={(e) => setDraft({ ...draft, maxDiscountAmount: e.target.value })}
                  placeholder="Uncapped"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
                />
              </Field>
            )}

            <Field label="Minimum order value (₹)">
              <input
                type="number"
                min={0}
                value={draft.minOrderValue}
                onChange={(e) => setDraft({ ...draft, minOrderValue: e.target.value })}
                placeholder="0"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </Field>

            <Field label="Usage limit (optional)">
              <input
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </Field>

            <Field label="Expires on (optional)">
              <input
                type="date"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
            </Field>
          </div>

          {formError && <p className="text-xs font-medium text-danger">{formError}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft(EMPTY_DRAFT);
                setFormError(null);
              }}
              className="text-sm font-medium text-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create code'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Discount</th>
              <th className="p-4 font-medium">Min order</th>
              <th className="p-4 font-medium">Used</th>
              <th className="p-4 font-medium">Expires</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {codes.map((promo) => (
              <tr key={promo.id} className="border-b border-border last:border-0">
                <td className="p-4 font-semibold tabular-nums text-ink">{promo.code}</td>
                <td className="p-4 text-ink-soft">
                  {promo.discountType === 'flat' ? `₹${promo.discountValue} off` : `${promo.discountValue}% off`}
                  {promo.maxDiscountAmount != null && ` (up to ₹${promo.maxDiscountAmount})`}
                </td>
                <td className="p-4 tabular-nums text-ink-soft">₹{promo.minOrderValue}</td>
                <td className="p-4 tabular-nums text-ink-soft">
                  {promo.timesUsed}
                  {promo.usageLimit != null ? ` / ${promo.usageLimit}` : ''}
                </td>
                <td className="p-4 text-ink-soft">{formatExpiry(promo.expiresAt)}</td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(promo)}
                    className={clsx(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      promo.isActive ? 'bg-green-50 text-success' : 'bg-accent text-muted',
                    )}
                  >
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id)}
                    className="text-muted hover:text-danger"
                    aria-label={`Delete ${promo.code}`}
                  >
                    <Trash2 size={15} />
                  </button>
                  {rowError?.id === promo.id && <p className="mt-1 text-xs text-danger">{rowError.message}</p>}
                </td>
              </tr>
            ))}

            {!loading && codes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">
                  No promo codes yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
