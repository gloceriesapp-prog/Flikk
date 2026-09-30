'use client';

import { useState } from 'react';
import type { Store } from '@/lib/partnerApi';
import { updateMyStore } from '@/lib/partnerApi';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  onSaved: (store: Store) => void;
}

// Store identity — name, owner, category, registration numbers. Phone is
// deliberately read-only: it's the real OTP-verified users.phone (see
// partnerApi.ts's own Store.phone note), not a free-text field this screen
// could silently desync from the number the owner actually logs in with.
export function StoreProfileForm({ store: initial, onSaved }: Props) {
  const [store, setStore] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateMyStore({
        name: store.name,
        owner_name: store.owner_name,
        category: store.category,
        district: store.district,
        gst_number: store.gst_number,
        shop_establishment_number: store.shop_establishment_number,
      });
      setStore(updated);
      onSaved(updated);
      setSavedAt(Date.now());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection title="Store profile" description="How your store is identified across Gloceries.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Store name">
            <input required value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="input" />
          </Field>
          <Field label="Owner name">
            <input
              value={store.owner_name ?? ''}
              onChange={(e) => setStore({ ...store, owner_name: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" hint="Verified at login — can't be changed here.">
            <input value={store.phone ?? ''} disabled className="input cursor-not-allowed bg-neutral-50 text-neutral-400" />
          </Field>
          <Field label="Category">
            <input required value={store.category} onChange={(e) => setStore({ ...store, category: e.target.value })} className="input" />
          </Field>
        </div>

        <Field label="District">
          <input
            value={store.district ?? ''}
            onChange={(e) => setStore({ ...store, district: e.target.value })}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="GST number" hint="Optional">
            <input
              value={store.gst_number ?? ''}
              onChange={(e) => setStore({ ...store, gst_number: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Shop establishment number" hint="Optional">
            <input
              value={store.shop_establishment_number ?? ''}
              onChange={(e) => setStore({ ...store, shop_establishment_number: e.target.value })}
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
