'use client';

// Store onboarding — the real document set a kirana/pharmacy store needs
// before it can legally list on Flikk:
//   FSSAI license/registration — mandatory for any food/grocery business
//   Shop & Establishment license — standard municipal registration
//   GSTIN — only once turnover crosses ₹40L, so conditional not mandatory
//   Owner's PAN + Aadhaar — identity verification
//   Bank details — weekly payout settlement
//   Storefront photo — same real-photo trust convention as products
//   Drug License — pharmacy category only, its own stricter path
// onAdd is async — StoresPage POSTs to /api/stores (service-role write,
// see that route's own note) and refetches the live list.

import { useState } from 'react';
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
    phone: '',
    addressLine: '',
    city: '',
    state: 'Karnataka',
    country: 'India',
    openTime: '9:00 AM',
    closeTime: '9:00 PM',
    photoUrl: undefined as string | undefined,
    fssaiNumber: '',
    shopEstablishmentNumber: '',
    panNumber: '',
    aadhaarLast4: '',
    bankName: '',
    bankAccountLast4: '',
    turnoverExceedsGstThreshold: false,
    gstNumber: '',
    drugLicenseNumber: '',
  };
}

export function AddStoreModal({ onClose, onAdd }: { onClose: () => void; onAdd: (store: NewStoreInput) => Promise<void> }) {
  const [draft, setDraft] = useState(makeEmptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPharmacy = draft.category === 'Pharmacy';

  async function handleAdd() {
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        ...draft,
        district: draft.city,
        gstNumber: draft.turnoverExceedsGstThreshold ? draft.gstNumber.trim() || undefined : undefined,
        drugLicenseNumber: isPharmacy ? draft.drugLicenseNumber.trim() || undefined : undefined,
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

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Owner</p>
          <div className="flex gap-3">
            <input
              value={draft.ownerName}
              onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Owner's full name"
              aria-label="Owner's name"
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Phone number"
              aria-label="Phone number"
            />
          </div>

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
              value={draft.openTime}
              onChange={(e) => setDraft({ ...draft, openTime: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Opens at (e.g. 9:00 AM)"
              aria-label="Opens at"
            />
            <input
              value={draft.closeTime}
              onChange={(e) => setDraft({ ...draft, closeTime: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Closes at (e.g. 9:00 PM)"
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
            <input
              value={draft.aadhaarLast4}
              onChange={(e) => setDraft({ ...draft, aadhaarLast4: e.target.value })}
              maxLength={4}
              className={FIELD_CLASS}
              placeholder="Aadhaar — last 4 digits"
              aria-label="Aadhaar last 4 digits"
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

          <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={draft.turnoverExceedsGstThreshold}
              onChange={(e) => setDraft({ ...draft, turnoverExceedsGstThreshold: e.target.checked })}
            />
            Annual turnover exceeds ₹40L (GSTIN required)
          </label>
          {draft.turnoverExceedsGstThreshold && (
            <input
              value={draft.gstNumber}
              onChange={(e) => setDraft({ ...draft, gstNumber: e.target.value })}
              className={FIELD_CLASS}
              placeholder="GSTIN"
              aria-label="GSTIN"
            />
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payout account</p>
          <div className="flex gap-3">
            <input
              value={draft.bankName}
              onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Bank name"
              aria-label="Bank name"
            />
            <input
              value={draft.bankAccountLast4}
              onChange={(e) => setDraft({ ...draft, bankAccountLast4: e.target.value })}
              maxLength={4}
              className={FIELD_CLASS}
              placeholder="Account — last 4 digits"
              aria-label="Bank account last 4 digits"
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
            disabled={!draft.name.trim() || submitting}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add store'}
          </button>
        </div>
      </div>
    </div>
  );
}
