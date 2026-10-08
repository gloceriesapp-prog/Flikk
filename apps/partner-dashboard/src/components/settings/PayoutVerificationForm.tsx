'use client';

import { useState } from 'react';
import type { Store } from '@/lib/partnerApi';
import { saveUpiPayoutAccount } from '@/lib/partnerApi';
import { PayoutDestinationCard } from '@/components/payouts/PayoutDestinationCard';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  // PUT /partner/payout-account returns a PayoutAccount, not the Store shape
  // PayoutDestinationCard reads — so re-fetch instead of patching locally.
  onVerified: () => Promise<void> | void;
}

// Same rule as the backend (backend/PAYOUTS.md); the server re-validates.
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

// Payouts are sent manually each week. Saving stores the UPI ID as
// unverified; the founder confirms the registered name in the UPI app when
// paying. Bank accounts need a cheque photo, so they're set in the mobile app.
export function PayoutVerificationForm({ store, onVerified }: Props) {
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const value = upiId.trim();
    setError(null);
    setSaved(false);
    if (!UPI_RE.test(value)) {
      setError('Enter a valid UPI ID, like yourname@bank.');
      return;
    }
    setSaving(true);
    try {
      await saveUpiPayoutAccount(value);
      setUpiId('');
      setSaved(true);
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this UPI ID.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Payout method"
      description="Payouts are sent weekly after verification. We confirm the account name when we send your first payout."
    >
      <div className="mb-5">
        <PayoutDestinationCard store={store} linkToSettings={false} />
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Field label="UPI ID">
          <input required value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank" className="input" />
        </Field>
        {store.payout_method && (
          <p className="text-sm text-neutral-500">Saving a new UPI ID replaces your current payout method and resets verification.</p>
        )}
        <p className="text-sm text-neutral-500">To get paid to a bank account, add it in the Gloceries Partner app (needs a cancelled cheque photo).</p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Saved. We&apos;ll confirm the name with your first payout.</p>}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#FF6B4A] px-5 py-2.5 text-sm font-medium text-[#101C10] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save UPI ID'}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
