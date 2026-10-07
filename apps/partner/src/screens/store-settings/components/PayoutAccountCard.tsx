// Payout destination — UPI ID or bank account (backend/PAYOUTS.md). Payouts
// are sent manually by the founder every Monday; nothing here contacts a
// bank. Saved via PUT /partner/payout-account, read via GET (TanStack
// Query, PAYOUT_ACCOUNT_QUERY_KEY — also read by OrdersScreen's setup
// banner). The full account number lives in this card's form state only
// until a successful save, then it's wiped; afterwards only accountLast4
// from the server response is ever shown.
//
// Bank method requires a photo of a cancelled cheque / passbook first page
// (private store-documents bucket, path sent as proofPath). Any edit resets
// the server-side verification status, so the edit form warns about it.

import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BankIcon, CheckmarkCircle02Icon, ImageUpload01Icon } from '@hugeicons/core-free-icons';
import {
  EMPTY_PAYOUT_FORM,
  payoutAccountStatusLabel,
  validatePayoutForm,
  type PayoutAccount,
  type PayoutFormErrors,
  type PayoutFormValues,
} from '@gloceries/shared';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ApiError } from '../../../api/client';
import { fetchPayoutAccount, PAYOUT_ACCOUNT_QUERY_KEY, savePayoutAccount, uploadPayoutProof } from '../../../api/payouts';
import { compressImageToTarget } from '../../../media/compressImage';
import { SettingsCard } from './SettingsCard';

const ACCENT = '#1754cf';
const INPUT_CLASS = 'rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink';

export function PayoutAccountCard() {
  const queryClient = useQueryClient();
  const { data: account, isLoading, isError, refetch } = useQuery({ queryKey: PAYOUT_ACCOUNT_QUERY_KEY, queryFn: fetchPayoutAccount });
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <SettingsCard icon={BankIcon} title="Payout details">
        <ActivityIndicator color={colors.ink} />
      </SettingsCard>
    );
  }

  if (isError || !account) {
    return (
      <SettingsCard icon={BankIcon} title="Payout details">
        <Pressable onPress={() => void refetch()} accessibilityRole="button">
          <Text className="text-[13px] font-semibold text-danger">Couldn’t load payout details. Tap to retry.</Text>
        </Pressable>
      </SettingsCard>
    );
  }

  if (!editing && account.method) {
    return (
      <SettingsCard icon={BankIcon} title="Payout details">
        <AccountSummary account={account} onChange={() => setEditing(true)} />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard icon={BankIcon} title="Payout details">
      <PayoutForm
        hasExisting={!!account.method}
        initialMethod={account.method ?? 'upi'}
        defaultHolderName={account.accountHolderName ?? ''}
        onCancel={account.method ? () => setEditing(false) : undefined}
        onSave={savePayoutAccount}
        onSaved={(saved) => {
          queryClient.setQueryData(PAYOUT_ACCOUNT_QUERY_KEY, saved);
          void queryClient.invalidateQueries({ queryKey: PAYOUT_ACCOUNT_QUERY_KEY });
          setEditing(false);
        }}
      />
    </SettingsCard>
  );
}

function AccountSummary({ account, onChange }: { account: PayoutAccount; onChange: () => void }) {
  const verified = account.status === 'verified';
  return (
    <>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[13px] font-medium text-ink/40">{account.method === 'upi' ? 'UPI ID' : 'Bank account'}</Text>
          <Text className="mt-0.5 text-[15px] font-semibold text-ink">
            {account.method === 'upi' ? account.upiId : `•••• ${account.accountLast4 ?? ''} · ${account.ifsc ?? ''}`}
          </Text>
        </View>
        <Pressable onPress={onChange} hitSlop={10} accessibilityRole="button" accessibilityLabel="Change payout details">
          <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
            Change
          </Text>
        </Pressable>
      </View>

      <View className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${verified ? 'bg-success/10' : 'bg-gold/15'}`}>
        {verified && <AppIcon icon={CheckmarkCircle02Icon} size={12} color={colors.success} />}
        <Text className="flex-shrink text-[12px] font-semibold" style={{ color: verified ? colors.success : colors.ink }}>
          {payoutAccountStatusLabel(account)}
        </Text>
      </View>

      {(account.accountHolderName || account.bankName) && (
        <View className="gap-2 border-t border-black/5 pt-3">
          {account.accountHolderName && <Row label="Account holder" value={account.accountHolderName} />}
          {account.bankName && <Row label="Bank" value={account.bankName} />}
        </View>
      )}

      <Text className="text-[13px] font-medium text-ink/40">Your weekly payout (see the Payouts tab) is sent here every Monday.</Text>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[13px] font-medium text-ink/50">{label}</Text>
      <Text className="text-[13px] font-semibold text-ink">{value}</Text>
    </View>
  );
}

function PayoutForm({
  hasExisting,
  initialMethod,
  defaultHolderName,
  onCancel,
  onSave,
  onSaved,
}: {
  hasExisting: boolean;
  initialMethod: PayoutFormValues['method'];
  defaultHolderName: string;
  onCancel?: () => void;
  onSave: typeof savePayoutAccount;
  onSaved: (account: PayoutAccount) => void;
}) {
  // Starts blank (not prefilled with the old destination) — the server only
  // ever returns the last 4 digits anyway.
  const [values, setValues] = useState<PayoutFormValues>({ ...EMPTY_PAYOUT_FORM, method: initialMethod, accountHolderName: defaultHolderName });
  const [errors, setErrors] = useState<PayoutFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const mutation = useMutation({
    mutationFn: onSave,
    onSuccess: (saved) => {
      setValues(EMPTY_PAYOUT_FORM); // never keep the full account number around after save
      onSaved(saved);
    },
    onError: (err) => setServerError(err instanceof ApiError ? err.message : 'Could not save payout details. Please try again.'),
  });
  const busy = mutation.isPending || uploadingProof;

  function set<K extends keyof PayoutFormValues>(key: K, value: PayoutFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  }

  async function pickProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add your cheque or passbook photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) return;
    setUploadingProof(true);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.base64);
      const { path } = await uploadPayoutProof(compressed.base64);
      set('proofPath', path);
    } catch (err) {
      setErrors((e) => ({ ...e, proofPath: err instanceof ApiError ? err.message : 'Upload failed. Please try again.' }));
    } finally {
      setUploadingProof(false);
    }
  }

  function submit() {
    const { errors: next, input } = validatePayoutForm(values);
    setErrors(next);
    if (input) mutation.mutate(input);
  }

  return (
    <>
      {hasExisting && (
        <View className="rounded-2xl bg-gold/15 px-3.5 py-3">
          <Text className="text-[12.5px] font-medium leading-[17px] text-ink/70">
            Saving new details resets verification — we’ll confirm the name again when we send your next payout.
          </Text>
        </View>
      )}

      {/* Method toggle — same segmented-pill convention as OrderStatusFilter. */}
      <View className="flex-row gap-2 rounded-2xl bg-gray-100 p-1" accessibilityRole="tablist">
        {(['upi', 'bank'] as const).map((option) => {
          const active = values.method === option;
          return (
            <Pressable
              key={option}
              onPress={() => set('method', option)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center rounded-xl py-2"
              style={{ backgroundColor: active ? '#FFFFFF' : 'transparent' }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: active ? ACCENT : `${colors.ink}70` }}>
                {option === 'upi' ? 'UPI' : 'Bank account'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {values.method === 'upi' ? (
        <Field label="UPI ID" error={errors.upiId}>
          <TextInput
            value={values.upiId}
            onChangeText={(t) => set('upiId', t.replace(/\s/g, ''))}
            placeholder="yourname@okhdfcbank"
            placeholderTextColor="#9AA5A3"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            className={INPUT_CLASS}
          />
        </Field>
      ) : (
        <View className="gap-3">
          <Field label="Account holder name" error={errors.accountHolderName}>
            <TextInput value={values.accountHolderName} onChangeText={(t) => set('accountHolderName', t)} placeholder="As it appears on the bank account" placeholderTextColor="#9AA5A3" editable={!busy} className={INPUT_CLASS} />
          </Field>
          <Field label="Account number" error={errors.accountNumber}>
            <TextInput value={values.accountNumber} onChangeText={(t) => set('accountNumber', t.replace(/\D/g, ''))} placeholder="e.g. 765432123456" placeholderTextColor="#9AA5A3" keyboardType="number-pad" secureTextEntry editable={!busy} maxLength={18} className={INPUT_CLASS} />
          </Field>
          <Field label="Confirm account number" error={errors.confirmAccountNumber}>
            <TextInput value={values.confirmAccountNumber} onChangeText={(t) => set('confirmAccountNumber', t.replace(/\D/g, ''))} placeholder="Re-enter account number" placeholderTextColor="#9AA5A3" keyboardType="number-pad" editable={!busy} maxLength={18} contextMenuHidden className={INPUT_CLASS} />
          </Field>
          <Field label="IFSC code" error={errors.ifsc}>
            <TextInput value={values.ifsc} onChangeText={(t) => set('ifsc', t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} placeholder="e.g. HDFC0000053" placeholderTextColor="#9AA5A3" autoCapitalize="characters" autoCorrect={false} maxLength={11} editable={!busy} className={INPUT_CLASS} />
          </Field>
          <Field label="Bank name (optional)">
            <TextInput value={values.bankName} onChangeText={(t) => set('bankName', t)} placeholder="e.g. HDFC Bank" placeholderTextColor="#9AA5A3" editable={!busy} className={INPUT_CLASS} />
          </Field>
          <Field label="Cancelled cheque or passbook first page" error={errors.proofPath}>
            <Pressable
              onPress={pickProof}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={values.proofPath ? 'Replace cheque or passbook photo' : 'Add cheque or passbook photo'}
              className={`flex-row items-center gap-2.5 rounded-2xl px-4 py-3.5 ${values.proofPath ? 'bg-success/10' : 'border border-dashed border-black/15 bg-[#F9FAFB]'}`}
            >
              {uploadingProof ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <AppIcon icon={values.proofPath ? CheckmarkCircle02Icon : ImageUpload01Icon} size={18} color={values.proofPath ? colors.success : colors.ink} />
              )}
              <Text className="flex-1 text-[13px] font-semibold text-ink/80">
                {uploadingProof ? 'Uploading…' : values.proofPath ? 'Photo added — tap to replace' : 'Add photo (account number & name clearly visible)'}
              </Text>
            </Pressable>
          </Field>
        </View>
      )}

      {serverError && <Text className="text-[13px] font-medium text-danger">{serverError}</Text>}

      <Pressable
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        className="items-center justify-center rounded-2xl py-3.5"
        style={{ backgroundColor: colors.coral, opacity: busy ? 0.6 : 1 }}
      >
        {mutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-[14px] font-semibold text-white">Save payout details</Text>}
      </Pressable>
      {onCancel && (
        <Pressable onPress={onCancel} disabled={busy} accessibilityRole="button" className="items-center py-1">
          <Text className="text-[13px] font-semibold text-ink/50">Cancel</Text>
        </Pressable>
      )}

      <Text className="text-[13px] font-medium leading-normal text-ink/50">
        We pay out every Monday. When we send your first payout we check the name on the account matches.
      </Text>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink/50">{label}</Text>
      {children}
      {error && <Text className="text-[12px] font-medium text-danger">{error}</Text>}
    </View>
  );
}
