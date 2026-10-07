// Payout details form — shared by onboarding's BankDetailsScreen and
// Profile's EditPayoutModal (one form, two hosts, each with its own CTA).
// UPI ID, or bank account (holder, number + confirm, IFSC, optional bank
// name, REQUIRED cancelled cheque / passbook photo). Saved via PUT
// /rider/payout-account (backend/PAYOUTS.md) — manual weekly payouts, no
// bank call; the founder confirms the payee name when sending the first
// payout. After a successful save the form state (incl. the full account
// number) is wiped; only accountLast4 from the response is shown anywhere.

import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import {
  EMPTY_PAYOUT_FORM,
  payoutAccountStatusLabel,
  validatePayoutForm,
  type PayoutAccount,
  type PayoutFormErrors,
  type PayoutFormValues,
} from '@gloceries/shared';
import { ApiError } from '../../../api/client';
import { RIDER_PAYOUT_ACCOUNT_QUERY_KEY, savePayoutAccount } from '../../../api/payouts';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PhotoUploadCard } from '../IdentityVerificationScreen';
import { FieldCard } from './OnboardingScaffold';

const INPUT_CLASS = 'rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink';

export function usePayoutDetailsForm(onSaved: (account: PayoutAccount) => void) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PayoutFormValues>({ ...EMPTY_PAYOUT_FORM, method: 'bank' });
  const [errors, setErrors] = useState<PayoutFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: savePayoutAccount,
    onSuccess: (saved) => {
      setValues({ ...EMPTY_PAYOUT_FORM, method: 'bank' });
      queryClient.setQueryData(RIDER_PAYOUT_ACCOUNT_QUERY_KEY, saved);
      void queryClient.invalidateQueries({ queryKey: RIDER_PAYOUT_ACCOUNT_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['riderProfile'] });
      onSaved(saved);
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Could not save your payout details. Please try again.'),
  });

  function set<K extends keyof PayoutFormValues>(key: K, value: PayoutFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  }

  function submit() {
    const { errors: next, input } = validatePayoutForm(values);
    setErrors(next);
    if (input) mutation.mutate(input);
  }

  return { values, errors, serverError, set, submit, isSaving: mutation.isPending };
}

export type PayoutDetailsFormState = ReturnType<typeof usePayoutDetailsForm>;

export function PayoutDetailsFields({ form }: { form: PayoutDetailsFormState }) {
  const { values, errors, serverError, set, isSaving } = form;
  return (
    <>
      <View className="flex-row gap-1.5 rounded-2xl bg-[#EEF0F2] p-1.5" accessibilityRole="tablist">
        <MethodTab label="Bank account" active={values.method === 'bank'} onPress={() => set('method', 'bank')} />
        <MethodTab label="UPI ID" active={values.method === 'upi'} onPress={() => set('method', 'upi')} />
      </View>

      {values.method === 'bank' ? (
        <>
          <Field label="Account holder name" error={errors.accountHolderName}>
            <TextInput value={values.accountHolderName} onChangeText={(t) => set('accountHolderName', t)} placeholder="As printed on your bank account" placeholderTextColor="#9AA5A3" editable={!isSaving} className={INPUT_CLASS} />
          </Field>
          <Field label="Bank account number" error={errors.accountNumber}>
            <TextInput value={values.accountNumber} onChangeText={(t) => set('accountNumber', t.replace(/\D/g, ''))} placeholder="Account number" placeholderTextColor="#9AA5A3" keyboardType="number-pad" secureTextEntry maxLength={18} editable={!isSaving} className={INPUT_CLASS} />
          </Field>
          <Field label="Confirm account number" error={errors.confirmAccountNumber}>
            <TextInput value={values.confirmAccountNumber} onChangeText={(t) => set('confirmAccountNumber', t.replace(/\D/g, ''))} placeholder="Re-enter account number" placeholderTextColor="#9AA5A3" keyboardType="number-pad" maxLength={18} contextMenuHidden editable={!isSaving} className={INPUT_CLASS} />
          </Field>
          <Field label="IFSC code" error={errors.ifsc}>
            <TextInput value={values.ifsc} onChangeText={(t) => set('ifsc', t.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11).toUpperCase())} placeholder="e.g. HDFC0001234" placeholderTextColor="#9AA5A3" autoCapitalize="characters" autoCorrect={false} editable={!isSaving} className={INPUT_CLASS} />
          </Field>
          <Field label="Bank name (optional)">
            <TextInput value={values.bankName} onChangeText={(t) => set('bankName', t)} placeholder="e.g. State Bank of India" placeholderTextColor="#9AA5A3" editable={!isSaving} className={INPUT_CLASS} />
          </Field>
          <View className="gap-1.5">
            <PhotoUploadCard
              label="Cancelled cheque or passbook first page"
              kind="payout-proof"
              path={values.proofPath}
              onUploaded={(path) => set('proofPath', path)}
              hint="Account number & name clearly visible"
            />
            {errors.proofPath && <Text className="px-1 text-[12.5px] font-medium text-danger">{errors.proofPath}</Text>}
          </View>
        </>
      ) : (
        <Field label="UPI ID" error={errors.upiId}>
          <TextInput value={values.upiId} onChangeText={(t) => set('upiId', t.replace(/\s/g, ''))} placeholder="e.g. name@okhdfcbank" placeholderTextColor="#9AA5A3" autoCapitalize="none" autoCorrect={false} editable={!isSaving} className={INPUT_CLASS} />
        </Field>
      )}

      {serverError && <Text className="px-1 text-[13px] font-medium text-danger">{serverError}</Text>}
      <Text className="px-1 text-[12px] font-medium text-ink/45">
        Payouts are sent every Monday. We confirm the name on your account when we send your first payout.
      </Text>
    </>
  );
}

// "Unverified — …" / "Verified ✓ <name>" pill.
export function PayoutStatusPill({ account }: { account: PayoutAccount }) {
  const verified = account.status === 'verified';
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1 ${verified ? 'bg-success/10' : 'bg-gold/15'}`}>
      {verified && <AppIcon icon={CheckmarkCircle02Icon} size={13} color={colors.success} />}
      <Text className="flex-shrink text-[12px] font-semibold" style={{ color: verified ? colors.success : colors.ink }}>
        {payoutAccountStatusLabel(account)}
      </Text>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <FieldCard label={label}>
      {children}
      {error && <Text className="px-1 text-[12.5px] font-medium text-danger">{error}</Text>}
    </FieldCard>
  );
}

function MethodTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center rounded-xl py-2.5 ${active ? 'bg-white' : ''}`}
      style={active ? { shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
    >
      <Text className="text-[14px] font-semibold" style={{ color: active ? '#1447E6' : 'rgba(16,28,16,0.45)' }}>
        {label}
      </Text>
    </Pressable>
  );
}
