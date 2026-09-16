'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { Store, VerifyPayoutInput } from '@/lib/partnerApi';
import { verifyPayoutAccount } from '@/lib/partnerApi';
import { PayoutDestinationCard } from '@/components/payouts/PayoutDestinationCard';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  // Unlike the other two forms, verify-payout's response doesn't return
  // the full Store shape PayoutDestinationCard needs to re-render — so
  // this takes a re-fetch callback, not a patch to apply locally.
  onVerified: () => Promise<void> | void;
}

// The ONLY place a payout destination can actually change — everything
// here calls POST /partner/verify-payout, a real RazorpayX Fund Account
// Validation, never the generic PATCH /store (which silently drops these
// fields server-side, see updateMyStore's own note). Verifying replaces
// whatever destination was there before; there is no "edit" of an existing
// one, only "verify a new one."
export function PayoutVerificationForm({ store, onVerified }: Props) {
  const [method, setMethod] = useState<'upi' | 'bank_account'>(store.payout_method === 'bank_account' ? 'bank_account' : 'upi');
  const [vpa, setVpa] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(store.owner_name ?? '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (isVerifying) return;
    setError(null);
    setResult(null);

    const input: VerifyPayoutInput =
      method === 'upi' ? { method: 'upi', vpa: vpa.trim() } : { method: 'bank_account', accountNumber: accountNumber.trim(), ifsc: ifsc.trim(), accountHolderName: accountHolderName.trim() };

    setIsVerifying(true);
    try {
      const verified = await verifyPayoutAccount(input);
      setResult(`Verified — ${verified.accountHolderName} · ${verified.bankName}`);
      setVpa('');
      setAccountNumber('');
      setIfsc('');
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify this payout method.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <SettingsSection title="Payout method" description="Verified through Razorpay — this is where your weekly payouts land.">
      <div className="mb-5">
        <PayoutDestinationCard store={store} linkToSettings={false} />
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMethod('upi')}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-sm font-medium',
            method === 'upi' ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-600',
          )}
        >
          UPI
        </button>
        <button
          type="button"
          onClick={() => setMethod('bank_account')}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-sm font-medium',
            method === 'bank_account' ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-600',
          )}
        >
          Bank account
        </button>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        {method === 'upi' ? (
          <Field label="UPI ID">
            <input required value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="yourname@bank" className="input" />
          </Field>
        ) : (
          <>
            <Field label="Account holder name">
              <input required value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Account number">
                <input required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="input" />
              </Field>
              <Field label="IFSC">
                <input required value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} className="input" />
              </Field>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-emerald-600">{result}</p>}

        <div>
          <button
            type="submit"
            disabled={isVerifying}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isVerifying ? 'Verifying…' : 'Verify & save'}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
