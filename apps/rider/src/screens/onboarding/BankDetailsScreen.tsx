// Post-approval — "You're approved! One last thing." Shown by RootNavigator
// once a rider is role='rider' + approved but has no bank details on file
// yet (GET /auth/me's rider_payout_configured). Bank account only (no UPI),
// verified through the same RazorpayX Fund Account Validation the partner
// app uses (backend POST /rider/verify-payout, which persists the account
// on success). Flipping payoutConfigured swaps RootNavigator straight to
// the real app shell — there's no separate "done" navigation.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { verifyRiderPayout } from '../../api/onboarding';
import { ApiError } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';

const IFSC_LENGTH = 11;

export function BankDetailsScreen() {
  const setPayoutConfigured = useAuthStore((s) => s.setPayoutConfigured);
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    accountHolderName.trim().length > 0 && accountNumber.trim().length >= 6 && ifsc.trim().length === IFSC_LENGTH;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await verifyRiderPayout(accountNumber.trim(), ifsc.trim().toUpperCase(), accountHolderName.trim());
      // Backend persisted the account on a successful verify — flipping
      // this is all RootNavigator needs to show the app shell.
      setPayoutConfigured(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify your bank details. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingScaffold
      title="You're approved! One last thing."
      subheading="Add your bank details to receive delivery earnings."
      footer={<PrimaryButton label="Finish setup" onPress={handleSubmit} disabled={!canSubmit} loading={loading} trailingIcon={ArrowRight01Icon} tone="blue" />}
    >
      <FieldCard label="Account holder name">
        <TextInput
          value={accountHolderName}
          onChangeText={setAccountHolderName}
          placeholder="As printed on your bank account"
          placeholderTextColor="#9AA5A3"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <FieldCard label="Bank account number">
        <TextInput
          value={accountNumber}
          onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
          placeholder="Account number"
          placeholderTextColor="#9AA5A3"
          keyboardType="number-pad"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <FieldCard label="IFSC code">
        <TextInput
          value={ifsc}
          onChangeText={(t) => setIfsc(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, IFSC_LENGTH).toUpperCase())}
          placeholder="e.g. HDFC0001234"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="characters"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      {error && <Text className="px-1 text-[13px] font-medium text-danger">{error}</Text>}
    </OnboardingScaffold>
  );
}
