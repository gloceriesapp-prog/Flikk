// Post-approval — "You're approved! One last thing." Shown by RootNavigator
// once a rider is role='rider' + approved but has no payout method on file
// yet (GET /auth/me's rider_payout_configured). Bank account or UPI ID,
// saved via PUT /rider/payout-account (PayoutDetailsForm, backend/
// PAYOUTS.md). Flipping payoutConfigured swaps RootNavigator straight to the
// app shell.

import { useState } from 'react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { OnboardingScaffold } from './components/OnboardingScaffold';
import { PayoutDetailsFields, usePayoutDetailsForm } from './components/PayoutDetailsForm';
import { PayoutSuccessScreen } from './PayoutSuccessScreen';

export function BankDetailsScreen() {
  const setPayoutConfigured = useAuthStore((s) => s.setPayoutConfigured);
  // Saved — hold on the success screen first; it flips payoutConfigured
  // itself after a beat (all RootNavigator needs to show the app shell).
  const [saved, setSaved] = useState(false);
  const form = usePayoutDetailsForm(() => setSaved(true));

  if (saved) {
    return <PayoutSuccessScreen onContinue={() => setPayoutConfigured(true)} />;
  }

  return (
    <OnboardingScaffold
      title="You're approved! One last thing."
      subheading="Add where you'd like to receive your delivery earnings."
      footer={<PrimaryButton label="Save & finish" onPress={form.submit} loading={form.isSaving} trailingIcon={ArrowRight01Icon} tone="coral" />}
    >
      <PayoutDetailsFields form={form} />
    </OnboardingScaffold>
  );
}
