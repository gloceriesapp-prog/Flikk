'use client';

import { useEffect, useState } from 'react';
import type { Store, StoreCategoryOption } from '@/lib/partnerApi';
import { fetchStoreCategories, updateMyStore } from '@/lib/partnerApi';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  onSaved: (store: Store) => void;
}

// Store identity — name, owner, category, registration numbers. Phone is
// deliberately read-only: it's the real OTP-verified users.phone (see
// partnerApi.ts's own Store.phone note), not a free-text field this screen
// could silently desync from the number the owner actually logs in with.
// Reviewed fields start from the pending request so re-saving keeps it.
function withPending(store: Store): Store {
  const pending = store.pending_change?.changes ?? {};
  const text = (key: string, live: string | null) => (key in pending ? ((pending[key] as string | null) ?? '') : live);
  return {
    ...store,
    name: text('name', store.name) ?? '',
    category: text('category', store.category) ?? '',
    district: text('district', store.district),
    drug_license_number: text('drug_license_number', store.drug_license_number ?? null),
  };
}

export function StoreProfileForm({ store: initial, onSaved }: Props) {
  const [store, setStore] = useState(() => withPending(initial));
  const [live, setLive] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategoryOption[]>([]);
  useEffect(() => {
    fetchStoreCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  const needsDrugLicense = categories.some((c) => c.name === store.category && c.requires_drug_license);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateMyStore({
        name: store.name,
        owner_name: store.owner_name,
        category: store.category,
        district: store.district,
        gst_number: store.gst_number,
        shop_establishment_number: store.shop_establishment_number,
        ...(needsDrugLicense ? { drug_license_number: store.drug_license_number ?? '' } : {}),
      });
      setStore(withPending(updated));
      setLive(updated);
      onSaved(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection title="Store profile" description="How your store is identified across Gloceries.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {live.pending_change ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Pending review.</span> Changes to your store name, category, address or licence go live once
            Gloceries approves them. Customers still see “{live.name}” in {live.category} until then.
          </p>
        ) : live.last_change_review?.status === 'rejected' ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">Last change not approved:</span> {live.last_change_review.review_reason ?? 'Contact Gloceries support.'}
          </p>
        ) : null}
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
            <select required value={store.category} onChange={(e) => setStore({ ...store, category: e.target.value })} className="input">
              {!categories.some((c) => c.name === store.category) && <option value={store.category}>{store.category}</option>}
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {needsDrugLicense && (
          <Field label="Drug licence number" hint="Required for a pharmacy">
            <input
              required
              value={store.drug_license_number ?? ''}
              onChange={(e) => setStore({ ...store, drug_license_number: e.target.value })}
              className="input"
            />
          </Field>
        )}

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
          {savedAt && !error && <span className="text-sm text-emerald-600">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </SettingsSection>
  );
}
