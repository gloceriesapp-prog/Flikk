'use client';

import { useState } from 'react';
import type { Store } from '@/lib/partnerApi';
import { updateMyStore } from '@/lib/partnerApi';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  onSaved: (store: Store) => void;
}

// Availability — whether the store accepts orders right now, and the
// hours/prep-time customers see. Same 'gloceries:store-updated' broadcast the
// Overview page's own online/offline toggle already uses, so a change made
// here is reflected there (and in the sidebar) without a full reload.
export function StoreHoursForm({ store: initial, onSaved }: Props) {
  const [store, setStore] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateMyStore({
        is_active: store.is_active,
        open_time: store.open_time,
        close_time: store.close_time,
        avg_prep_minutes: store.avg_prep_minutes,
      });
      setStore(updated);
      onSaved(updated);
      window.dispatchEvent(new CustomEvent('gloceries:store-updated', { detail: updated }));
      setSavedAt(Date.now());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection title="Availability" description="When your store is open, and how long orders take to prep.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex items-center gap-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={store.is_active}
            disabled={store.admin_suspended}
            onChange={(e) => setStore({ ...store, is_active: e.target.checked })}
          />
          Store is open for orders
        </label>
        {store.admin_suspended && (
          <p className="text-sm text-red-700">
            Suspended by Gloceries{store.suspended_reason ? `: ${store.suspended_reason}` : ''}. Contact Gloceries support to reopen.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
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
          <Field label="Avg. prep time (min)">
            <input
              type="number"
              min="0"
              value={store.avg_prep_minutes ?? ''}
              onChange={(e) => setStore({ ...store, avg_prep_minutes: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>

        <div className="mt-1 flex items-center gap-3">
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
    </SettingsSection>
  );
}
