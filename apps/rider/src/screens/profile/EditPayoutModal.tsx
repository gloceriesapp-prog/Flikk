// The only editable thing on a rider's profile — where their earnings land.
// Everything else (name, Aadhaar, DL, vehicle, emergency contact) is fixed at
// onboarding and admin-approved, so it's read-only. Same bank/UPI form and
// same RazorpayX-backed verify flow as onboarding's BankDetailsScreen — just
// hosted in a modal here, and on success it invalidates ['riderProfile'] so
// the Payout card re-renders with the new destination instead of flipping the
// onboarding payoutConfigured gate.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { verifyRiderPayout, type RiderPayoutInput } from '../../api/onboarding';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';

const IFSC_LENGTH = 11;
const INPUT_CLASS = 'rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink';
// Minimal VPA shape; the real check is the RazorpayX penny-drop on submit.
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

type Method = 'bank_account' | 'upi';

export function EditPayoutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<Method>('bank_account');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [vpa, setVpa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await verifyRiderPayout(input);
      await queryClient.invalidateQueries({ queryKey: ['riderProfile'] });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify your payout details. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">Update payout method</Text>
            <Pressable onPress={onClose} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F2F4]">
              <AppIcon icon={Cancel01Icon} size={16} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[420px]" contentContainerClassName="gap-3">
            <View className="flex-row gap-1.5 rounded-2xl bg-[#EEF0F2] p-1.5">
              <MethodTab label="Bank account" active={method === 'bank_account'} onPress={() => { setMethod('bank_account'); setError(null); }} />
              <MethodTab label="UPI ID" active={method === 'upi'} onPress={() => { setMethod('upi'); setError(null); }} />
            </View>

            {method === 'bank_account' ? (
              <>
                <TextInput value={accountHolderName} onChangeText={setAccountHolderName} placeholder="Account holder name" placeholderTextColor="#9AA5A3" className={INPUT_CLASS} />
                <TextInput value={accountNumber} onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))} placeholder="Bank account number" placeholderTextColor="#9AA5A3" keyboardType="number-pad" className={INPUT_CLASS} />
                <TextInput value={ifsc} onChangeText={(t) => setIfsc(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, IFSC_LENGTH).toUpperCase())} placeholder="IFSC code (e.g. HDFC0001234)" placeholderTextColor="#9AA5A3" autoCapitalize="characters" className={INPUT_CLASS} />
              </>
            ) : (
              <TextInput value={vpa} onChangeText={(t) => setVpa(t.replace(/\s/g, ''))} placeholder="UPI ID (e.g. name@okhdfcbank)" placeholderTextColor="#9AA5A3" autoCapitalize="none" autoCorrect={false} className={INPUT_CLASS} />
            )}

            {error && <Text className="px-1 text-[13px] font-medium text-danger">{error}</Text>}
          </ScrollView>

          <View className="mt-4">
            <PrimaryButton label={method === 'upi' ? 'Verify UPI & save' : 'Verify & save'} onPress={handleSubmit} disabled={!canSubmit} loading={loading} tone="blue" />
          </View>
        </View>
      </View>
    </Modal>
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
