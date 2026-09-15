'use client';

import { useEffect, useState } from 'react';
import { fetchMyStore, updateMyStore, type Store } from '@/lib/partnerApi';

export default function SettingsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetchMyStore()
      .then(setStore)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!store || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateMyStore({
        name: store.name,
        is_active: store.is_active,
        open_time: store.open_time,
        close_time: store.close_time,
        avg_prep_minutes: store.avg_prep_minutes,
        payout_upi_id: store.payout_upi_id,
      });
      setStore(updated);
      setSavedAt(Date.now());
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !store) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Store settings</h1>

      <form onSubmit={handleSave} className="flex max-w-lg flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <Field label="Store name">
          <input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="input" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={store.is_active} onChange={(e) => setStore({ ...store, is_active: e.target.checked })} />
          Store open for orders
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Opens at">
            <input
              type="time"
              value={store.open_time ?? ''}
              onChange={(e) => setStore({ ...store, open_time: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Closes at">
            <input
              type="time"
              value={store.close_time ?? ''}
              onChange={(e) => setStore({ ...store, close_time: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <Field label="Avg. prep time (minutes)">
          <input
            type="number"
            min="0"
            value={store.avg_prep_minutes ?? ''}
            onChange={(e) => setStore({ ...store, avg_prep_minutes: Number(e.target.value) })}
            className="input"
          />
        </Field>

        <Field label="UPI ID for payouts">
          <input
            value={store.payout_upi_id ?? ''}
            onChange={(e) => setStore({ ...store, payout_upi_id: e.target.value })}
            placeholder="yourname@bank"
            className="input"
          />
        </Field>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}
