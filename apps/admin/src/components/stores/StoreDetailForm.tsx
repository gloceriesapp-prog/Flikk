'use client';

// Edit hours/category/contact + deactivate — the "store detail view" half
// of PRD A1/FR19. Matches apps/partner's own STORE_CATEGORIES list so a
// category picked here reads the same way it does in the partner app's
// own Store Settings screen.

import { useState } from 'react';
import { Power } from 'lucide-react';
import clsx from 'clsx';
import type { Store } from '@/lib/types';

const CATEGORIES = ['Kirana & Grocery', 'Pharmacy', 'Bakery', 'Fruits & Vegetables', 'General Store', 'Others'];

export function StoreDetailForm({ store }: { store: Store }) {
  const [category, setCategory] = useState(store.category);
  const [phone, setPhone] = useState(store.phone);
  const [openTime, setOpenTime] = useState(store.openTime);
  const [closeTime, setCloseTime] = useState(store.closeTime);
  const [isActive, setIsActive] = useState(store.isActive);

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
            {CATEGORIES.map((c) => (
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
          <Field label="District">
            <input
              value={store.district}
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

        <button
          type="button"
          className="mt-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Save changes
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
