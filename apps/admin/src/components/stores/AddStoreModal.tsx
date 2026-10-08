'use client';

// Admin Add Store — creates a live store for an existing Gloceries account
// (looked up by the owner's login phone), the same end state as approving a
// partner application. See lib/storeValidation.ts for the rules. The map pin
// (lat/lng) is required; payout details are set afterwards on the store page.
// onAdd is async — StoresPage POSTs to /api/stores and refetches the list.

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { NewStoreInput } from '@/lib/types';
import { STORE_CATEGORIES } from '@/lib/store-options';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

function makeEmptyDraft() {
  return {
    name: '',
    category: STORE_CATEGORIES[0] as string,
    ownerName: '',
    ownerPhone: '',
    phone: '',
    addressLine: '',
    city: '',
    state: 'Karnataka',
    country: 'India',
    lat: '',
    lng: '',
    openTime: '09:00',
    closeTime: '21:00',
    photoUrl: undefined as string | undefined,
    fssaiNumber: '',
    shopEstablishmentNumber: '',
    panNumber: '',
    gstNumber: '',
    udyamNumber: '',
    drugLicenseNumber: '',
    zoneId: '',
  };
}

export function AddStoreModal({ onClose, onAdd }: { onClose: () => void; onAdd: (store: NewStoreInput) => Promise<void> }) {
  const [draft, setDraft] = useState(makeEmptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeZones, setActiveZones] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch('/api/zones')
      .then((res) => (res.ok ? res.json() : []))
      .then((zones: { id: string; name: string; isActive: boolean }[]) => setActiveZones(zones.filter((z) => z.isActive)))
      .catch(() => setActiveZones([]));
  }, []);
  const isPharmacy = draft.category === 'Pharmacy';
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  const hasPin = draft.lat.trim() !== '' && draft.lng.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  async function handleAdd() {
    if (!hasPin) {
      setError('Enter the store’s latitude and longitude — without a map pin customers cannot find it.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        ...draft,
        lat,
        lng,
        phone: draft.phone.trim() || null,
        gstNumber: draft.gstNumber.trim() || null,
        udyamNumber: draft.udyamNumber.trim() || null,
        drugLicenseNumber: isPharmacy ? draft.drugLicenseNumber.trim() || null : null,
        // Only needed (and only shown) when several zones are active.
        zoneId: activeZones.length > 1 ? draft.zoneId || null : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add store — try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">Add store</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <ProductImageUpload
              imageUrl={draft.photoUrl}
              onChange={(photoUrl) => setDraft({ ...draft, photoUrl })}
              bucket="store-images"
            />
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Store name"
              aria-label="Store name"
            />
          </div>

          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={FIELD_CLASS}
            aria-label="Category"
          >
            {STORE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {activeZones.length > 1 && (
            <select
              value={draft.zoneId}
              onChange={(e) => setDraft({ ...draft, zoneId: e.target.value })}
              className={FIELD_CLASS}
              aria-label="Zone"
            >
              <option value="">Choose zone…</option>
              {activeZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Owner</p>
          <p className="-mt-2 text-xs text-muted">
            The owner must have signed in to a Gloceries app once with this phone. Their account becomes the store owner.
          </p>
          <div className="flex gap-3">
            <input
              value={draft.ownerName}
              onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Owner's full name"
              aria-label="Owner's name"
            />
            <input
              value={draft.ownerPhone}
              onChange={(e) => setDraft({ ...draft, ownerPhone: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Owner's login phone"
              aria-label="Owner's login phone"
              inputMode="tel"
            />
          </div>
          <input
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Store contact phone (optional)"
            aria-label="Store contact phone"
          />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Address</p>
          <input
            value={draft.addressLine}
            onChange={(e) => setDraft({ ...draft, addressLine: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Shop address (street, area)"
            aria-label="Address"
          />
          <div className="flex gap-3">
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className={FIELD_CLASS}
              placeholder="City"
              aria-label="City"
            />
            <input
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              className={FIELD_CLASS}
              placeholder="State"
              aria-label="State"
            />
            <input
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Country"
              aria-label="Country"
            />
          </div>

          <div className="flex gap-3">
            <input
              value={draft.lat}
              onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Latitude (e.g. 13.2203)"
              aria-label="Latitude"
              inputMode="decimal"
            />
            <input
              value={draft.lng}
              onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Longitude (e.g. 74.7500)"
              aria-label="Longitude"
              inputMode="decimal"
            />
          </div>

          <div className="flex gap-3">
            <input
              type="time"
              value={draft.openTime}
              onChange={(e) => setDraft({ ...draft, openTime: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Opens at"
              aria-label="Opens at"
            />
            <input
              type="time"
              value={draft.closeTime}
              onChange={(e) => setDraft({ ...draft, closeTime: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Closes at"
              aria-label="Closes at"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verification documents</p>
          <input
            value={draft.fssaiNumber}
            onChange={(e) => setDraft({ ...draft, fssaiNumber: e.target.value })}
            className={FIELD_CLASS}
            placeholder="FSSAI license/registration number"
            aria-label="FSSAI number"
          />
          <input
            value={draft.shopEstablishmentNumber}
            onChange={(e) => setDraft({ ...draft, shopEstablishmentNumber: e.target.value })}
            className={FIELD_CLASS}
            placeholder="Shop & Establishment license number"
            aria-label="Shop & Establishment license number"
          />
          <div className="flex gap-3">
            <input
              value={draft.panNumber}
              onChange={(e) => setDraft({ ...draft, panNumber: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Owner's PAN"
              aria-label="PAN number"
            />
          </div>

          {isPharmacy && (
            <input
              value={draft.drugLicenseNumber}
              onChange={(e) => setDraft({ ...draft, drugLicenseNumber: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Drug License number (state Drug Control authority)"
              aria-label="Drug License number"
            />
          )}

          <div className="flex gap-3">
            <input
              value={draft.gstNumber}
              onChange={(e) => setDraft({ ...draft, gstNumber: e.target.value })}
              className={FIELD_CLASS}
              placeholder="GSTIN (optional)"
              aria-label="GSTIN"
            />
            <input
              value={draft.udyamNumber}
              onChange={(e) => setDraft({ ...draft, udyamNumber: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Udyam registration (optional)"
              aria-label="Udyam registration"
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.name.trim() || !draft.ownerPhone.trim() || submitting}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add store'}
          </button>
        </div>
      </div>
    </div>
  );
}
