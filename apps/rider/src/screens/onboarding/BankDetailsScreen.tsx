// Post-approval — "You're approved! One last thing." Shown by RootNavigator
// once a rider is role='rider' + approved but has no payout method on file
// yet (GET /auth/me's rider_payout_configured). Two destinations, pick one:
// a bank account (holder name + number + IFSC) or a UPI ID — both verified
// through the same RazorpayX Fund Account Validation the partner app uses
// (backend POST /rider/verify-payout, which persists the method on success).
// Flipping payoutConfigured swaps RootNavigator straight to the app shell.

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { verifyRiderPayout, type RiderPayoutInput, type RiderPayoutVerificationResult } from '../../api/onboarding';
import { ApiError } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';
import { PayoutSuccessScreen } from './PayoutSuccessScreen';

const IFSC_LENGTH = 11;
const INPUT_CLASS = 'rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink';
// Minimal UPI VPA shape — "name@handle"; the real check is the RazorpayX
// penny-drop on the backend, this just blocks obvious typos before submit.
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

type Method = 'bank_account' | 'upi';

export function BankDetailsScreen() {
  const setPayoutConfigured = useAuthStore((s) => s.setPayoutConfigured);
  const [method, setMethod] = useState<Method>('bank_account');

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [vpa, setVpa] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On a verified payout we don't flip payoutConfigured straight away —
  // we hold on a success screen ("Account created!") first, and only flip
  // (which is what swaps RootNavigator to the app shell) when the rider
  // taps Continue. `result` carries the verified bank/UPI details to show.
  const [result, setResult] = useState<RiderPayoutVerificationResult | null>(null);

  const canSubmit =
    method === 'bank_account'
      ? accountHolderName.trim().length > 0 && accountNumber.trim().length >= 6 && ifsc.trim().length === IFSC_LENGTH
      : UPI_RE.test(vpa.trim());

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const input: RiderPayoutInput =
        method === 'bank_account'
          ? { method: 'bank_account', accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase(), accountHolderName: accountHolderName.trim() }
          : { method: 'upi', vpa: vpa.trim() };
      const res = await verifyRiderPayout(input);
      // Backend verified + persisted. Hold on the success screen — Continue
      // there flips payoutConfigured, which is all RootNavigator needs to
      // show the app shell.
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify your payout details. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Verified + saved — the success screen celebrates, then auto-redirects:
  // it flips payoutConfigured itself after a beat (all RootNavigator needs to
  // show the app shell), no Continue tap required.
  if (result) {
    return <PayoutSuccessScreen onContinue={() => setPayoutConfigured(true)} />;
  }

  return (
    <OnboardingScaffold
      title="You're approved! One last thing."
      subheading="Add where you'd like to receive your delivery earnings."
      footer={
        <PrimaryButton
          label={method === 'upi' ? 'Verify UPI & finish' : 'Verify & finish'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          trailingIcon={ArrowRight01Icon}
          tone="blue"
        />
      }
    >
      {/* Bank / UPI destination picker */}
      <View className="flex-row gap-1.5 rounded-2xl bg-[#EEF0F2] p-1.5">
        <MethodTab label="Bank account" active={method === 'bank_account'} onPress={() => { setMethod('bank_account'); setError(null); }} />
        <MethodTab label="UPI ID" active={method === 'upi'} onPress={() => { setMethod('upi'); setError(null); }} />
      </View>

      {method === 'bank_account' ? (
        <>
          <FieldCard label="Account holder name">
            <TextInput
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="As printed on your bank account"
              placeholderTextColor="#9AA5A3"
              className={INPUT_CLASS}
            />
          </FieldCard>

          <FieldCard label="Bank account number">
            <TextInput
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
              placeholder="Account number"
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              className={INPUT_CLASS}
            />
          </FieldCard>

          <FieldCard label="IFSC code">
            <TextInput
              value={ifsc}
              onChangeText={(t) => setIfsc(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, IFSC_LENGTH).toUpperCase())}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              className={INPUT_CLASS}
            />
          </FieldCard>
        </>
      ) : (
        <FieldCard label="UPI ID">
          <TextInput
            value={vpa}
            onChangeText={(t) => setVpa(t.replace(/\s/g, ''))}
            placeholder="e.g. name@okhdfcbank"
            placeholderTextColor="#9AA5A3"
            autoCapitalize="none"
            autoCorrect={false}
            className={INPUT_CLASS}
          />
          <Text className="text-[12px] font-medium text-ink/45">We&rsquo;ll verify this UPI ID with a small ₹1 check before your first payout.</Text>
        </FieldCard>
      )}

      {error && <Text className="px-1 text-[13px] font-medium text-danger">{error}</Text>}
    </OnboardingScaffold>
  );
}

function MethodTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-xl py-2.5 ${active ? 'bg-white' : ''}`}
      style={active ? { shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
    >
      <Text className="text-[14px] font-semibold" style={{ color: active ? '#1447E6' : 'rgba(16,28,16,0.45)' }}>
        {label}
      </Text>
    </Pressable>
  );
}
