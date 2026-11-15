import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiRequest } from '../../api/client';
import { IconlyIncognito } from '../../components/icons/iconly';
import type { AppStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { CareCard, CareLayout, QueryNotice } from '../customer-care/components/CareLayout';

type Props = NativeStackScreenProps<AppStackParamList, 'AccountPrivacy'>;
interface DeletionRequest { id: string; status: string; review_note: string | null }

const statusLabels: Record<string, string> = {
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Declined',
  completed: 'Completed',
};

export function AccountPrivacyScreen({ navigation }: Props) {
  const customerId = useAuthStore(s => s.customerId);
  const [reason, setReason] = useState('');
  const client = useQueryClient();
  const queryKey = ['privacy', 'deletion', customerId];
  const query = useQuery({
    queryKey,
    enabled: !!customerId,
    queryFn: () => apiRequest<DeletionRequest | null>('/privacy/deletion-request'),
  });
  const mutation = useMutation({
    mutationFn: () => apiRequest('/privacy/deletion-request', { method: 'POST', body: { reason } }),
    onSuccess: () => { void client.invalidateQueries({ queryKey }); },
    onError: () => Alert.alert('Request not confirmed', 'Please try again. If a request is already open, it will stay in place.'),
  });
  const request = query.data;
  const pending = request && ['pending', 'approved'].includes(request.status);

  function confirmDeletion() {
    Alert.alert(
      'Request account deletion?',
      'This sends a request to our team. You can still access your active orders during the review.',
      [
        { text: 'Keep account', style: 'cancel' },
        { text: 'Send request', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  }

  return (
    <CareLayout title="Account privacy" onBack={() => navigation.goBack()}>
      <CareCard>
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3FF]">
          <IconlyIncognito size={23} color={colors.primary} />
        </View>
        <Text accessibilityRole="header" className="text-[20px] font-bold leading-6 text-ink">Your information</Text>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/70">
          We use your profile, saved addresses, and order details for deliveries and customer support. You can update your profile and addresses from My Account.
        </Text>
      </CareCard>

      <CareCard>
        <Text accessibilityRole="header" className="text-[20px] font-bold leading-6 text-ink">Account deletion</Text>
        <Text className="mb-4 mt-2 text-[15px] leading-[22px] text-ink/70">
          We review deletion requests after active orders, refunds, and support issues are resolved. When deletion is complete, sign-in is disabled and reusable profile data is removed. We retain past order and payment records.
        </Text>
        <QueryNotice loading={query.isPending} error={query.error} hasData={query.isSuccess || !!request} retry={() => void query.refetch()} />
        {request && (
          <View className="mb-4 gap-1.5 rounded-2xl bg-[#F5F6F8] px-4 py-3">
            <Text className="text-[13px] font-semibold text-ink/65">Request status</Text>
            <Text className="text-base font-semibold text-ink">{statusLabels[request.status] ?? request.status}</Text>
            {request.review_note ? <Text className="text-sm leading-5 text-ink/70">{request.review_note}</Text> : null}
          </View>
        )}
        {query.isSuccess && !pending && (
          <>
            <Text className="mb-2 text-sm font-semibold text-ink">Reason (optional)</Text>
            <TextInput
              accessibilityLabel="Optional deletion reason"
              multiline
              maxLength={1000}
              value={reason}
              onChangeText={setReason}
              placeholder="Tell us why you’re leaving"
              placeholderTextColor="#69737D"
              textAlignVertical="top"
              className="min-h-24 rounded-2xl border border-[#E6E8EC] bg-[#F8F9FA] px-4 py-3 text-[15px] text-ink"
            />
            <Pressable
              accessibilityRole="button"
              disabled={mutation.isPending}
              onPress={confirmDeletion}
              className="mt-4 min-h-[48px] justify-center rounded-2xl bg-[#FDF0EE] px-4 py-3 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-center text-[15px] font-semibold text-[#A92B22]">
                {mutation.isPending ? 'Sending…' : 'Request account deletion'}
              </Text>
            </Pressable>
          </>
        )}
      </CareCard>
    </CareLayout>
  );
}
