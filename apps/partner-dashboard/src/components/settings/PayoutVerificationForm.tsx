'use client';

import { useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { PayoutVerification, Store } from '@/lib/partnerApi';
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

// Payouts are sent manually each week. On save the backend may check the UPI
// ID with the bank: a name matching the owner verifies it at once, a
// different name goes to the founder for review, and an ID the bank doesn't
// know is refused. Bank accounts need a cheque photo, so they're set in the
// mobile app.

type Result = { tone: 'success' | 'info'; title: string; body: string };

function resultFor(v: PayoutVerification | undefined, verifiedName: string | null): Result {
  if (v?.outcome === 'verified' || v?.outcome === 'already_verified') {
    const name = v.outcome === 'verified' ? v.nameAtBank : verifiedName;
    return { tone: 'success', title: 'UPI ID verified', body: name ? `Payouts will go to ${name}.` : 'Payouts will go to this UPI ID.' };
  }
  if (v?.outcome === 'name_mismatch') {
    return {
      tone: 'info',
      title: 'Saved, name under review',
      body: `This UPI ID belongs to ${v.nameAtBank}. If that isn't you, change it now. Otherwise Gloceries will confirm it before your first payout.`,
    };
  }
  return { tone: 'info', title: 'Payout details saved', body: 'Gloceries will confirm the account name before your first payout.' };
}
export function PayoutVerificationForm({ store, onVerified }: Props) {
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const value = upiId.trim();
    setError(null);
    setResult(null);
    if (!UPI_RE.test(value)) {
      setError('Enter a valid UPI ID, like yourname@bank.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveUpiPayoutAccount(value);
      setUpiId('');
      setResult(resultFor(saved.verification, saved.verifiedName));
      await onVerified();
    } catch (err) {
      // UPI_NOT_FOUND carries the user-facing reason ("couldn't find this UPI ID").
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
        <p className="-mt-2 text-sm text-neutral-500">We check this UPI ID with your bank to confirm the account holder&apos;s name.</p>
        {store.payout_method && (
          <p className="text-sm text-neutral-500">Saving a new UPI ID replaces your current payout method and resets verification.</p>
        )}
        <p className="text-sm text-neutral-500">To get paid to a bank account, add it in the Gloceries Partner app (needs a cancelled cheque photo).</p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div
            role="status"
            className={`flex gap-3 rounded-2xl px-4 py-3 text-sm ${result.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-accent-soft text-ink'}`}
          >
            {result.tone === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <Info size={18} className="mt-0.5 shrink-0 text-accent" />}
            <div>
              <p className="font-semibold">{result.title}</p>
              <p className="mt-0.5">{result.body}</p>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#155DFC] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Checking with your bank…' : 'Save UPI ID'}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
