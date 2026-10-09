// The only editable thing on a rider's profile — where their earnings land.
// Everything else (name, Aadhaar, DL, vehicle, emergency contact) is fixed at
// onboarding and admin-approved, so it's read-only. Shows the current
// destination + verification pill (GET /rider/payout-account), then the same
// PayoutDetailsForm onboarding uses (PUT /rider/payout-account). Saving
// invalidates the payout-account + riderProfile queries and closes.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { fetchPayoutAccount, RIDER_PAYOUT_ACCOUNT_QUERY_KEY } from '../../api/payouts';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { PayoutDetailsFields, PayoutStatusPill, usePayoutDetailsForm } from '../onboarding/components/PayoutDetailsForm';

export function EditPayoutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: account } = useQuery({ queryKey: RIDER_PAYOUT_ACCOUNT_QUERY_KEY, queryFn: fetchPayoutAccount, enabled: visible });
  const form = usePayoutDetailsForm(onClose);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">Payout details</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F2F4]"
            >
              <AppIcon icon={Cancel01Icon} size={16} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[520px]" contentContainerClassName="gap-3 pb-2">
            {account?.method && (
              <View className="gap-2 rounded-2xl bg-[#F7F9FB] p-4">
                <Text className="text-[12px] font-medium text-ink/45">Current {account.method === 'upi' ? 'UPI ID' : 'bank account'}</Text>
                <Text className="text-[15px] font-semibold text-ink">
                  {account.method === 'upi' ? account.upiId : `•••• ${account.accountLast4 ?? ''} · ${account.ifsc ?? ''}`}
                </Text>
                {account.accountHolderName && <Text className="text-[13px] font-medium text-ink/60">{account.accountHolderName}</Text>}
                <PayoutStatusPill account={account} />
                <Text className="text-[12px] font-medium text-ink/55">
                  Saving new details below resets verification — we’ll confirm the name again with your next payout.
                </Text>
              </View>
            )}
            <PayoutDetailsFields form={form} />
          </ScrollView>

          <View className="mt-4">
            <PrimaryButton label="Save payout details" onPress={form.submit} loading={form.isSaving} tone="primary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
