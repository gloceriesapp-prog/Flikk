'use client';

// Edit hours/category/contact + deactivate — the "store detail view" half
// of PRD A1/FR19. Category list matches apps/partner's own STORE_CATEGORIES
// (lib/store-options.ts, shared with AddStoreModal now). Onboarding
// documents (FSSAI, PAN, bank, address) are shown read-only — captured
// once at store creation, not re-editable here (see app/api/stores/[id]
// route's own note on why). Saving PATCHes /api/stores/[id].

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Power } from 'lucide-react';
import clsx from 'clsx';
import type { Store } from '@/lib/types';
import { STORE_CATEGORIES } from '@/lib/store-options';

export function StoreDetailForm({ store }: { store: Store }) {
  const router = useRouter();
  const [category, setCategory] = useState(store.category);
  const [phone, setPhone] = useState(store.phone);
  const [openTime, setOpenTime] = useState(store.openTime);
  const [closeTime, setCloseTime] = useState(store.closeTime);
  const [isActive, setIsActive] = useState(store.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, phone, openTime, closeTime, isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Save failed.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{store.name}</h1>
          <p className="text-sm text-muted">
            Owned by {store.ownerName} · Joined {store.joinedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={clsx(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold',
            isActive ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
          )}
        >
          <Power size={13} />
          {isActive ? 'Active' : 'Deactivated'}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-5 border-t border-border pt-6">
        <div className="gap-1.5">
          <label className="mb-1.5 block text-xs font-medium text-muted">Category</label>
          <div className="flex flex-wrap gap-2">
            {STORE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={clsx(
                  'rounded-full border px-3.5 py-2 text-xs font-semibold',
                  category === c ? 'border-ink bg-ink text-white' : 'border-border text-ink-soft'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none"
            />
          </Field>
          <Field label="Address">
            <input
              value={`${store.addressLine}, ${store.city}, ${store.state}`}
              disabled
              className="w-full rounded-xl border border-border bg-accent px-3.5 py-2.5 text-sm text-muted"
            />
          </Field>
          <Field label="Opens at">
            <input
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none"
            />
          </Field>
          <Field label="Closes at">
            <input
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none"
            />
          </Field>
        </div>

        <div className="border-t border-border pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Verification documents</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyField label="FSSAI number" value={store.fssaiNumber} />
            <ReadOnlyField label="Shop & Establishment license" value={store.shopEstablishmentNumber} />
            <ReadOnlyField label="PAN" value={store.panNumber} />
            <ReadOnlyField label="Aadhaar" value={store.aadhaarLast4 ? `•••• ${store.aadhaarLast4}` : '—'} />
            <ReadOnlyField label="GSTIN" value={store.gstNumber ?? 'Not applicable (under ₹40L threshold)'} />
            <ReadOnlyField label="Drug License" value={store.drugLicenseNumber ?? '—'} />
            <ReadOnlyField
              label="Payout account"
              value={store.bankName ? `${store.bankName} •••• ${store.bankAccountLast4}` : '—'}
            />
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="text-sm text-ink">{value || '—'}</p>
    </div>
  );
}
