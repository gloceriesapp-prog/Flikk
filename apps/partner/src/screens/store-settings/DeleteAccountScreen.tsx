// In-app account deletion request (Google Play requires one). Explains what
// is deleted and what the law makes us keep, then files the request with
// POST /partner/account/deletion-request. Admin completes it from the
// Support inbox. The backend refuses while the store still has active
// orders and says why; that message is shown as is. Accepting a request
// closes the owner's store (stores.is_active) so no new orders arrive while
// it is processed. Same screen as apps/rider's DeleteAccountScreen, with the
// partner app's own styling.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { ApiError } from '../../api/client';
import { fetchDeletionRequest, requestAccountDeletion, type DeletionRequest } from '../../api/accountDeletion';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import type { AppStackParamList } from '../../navigation/types';

const QUERY_KEY = ['partnerDeletionRequest'] as const;
const MAX_REASON = 500;
const CARD_BORDER = '#EAECEE';

const DELETED = [
  'Your owner profile, phone number and login',
  'Your KYC documents (Aadhaar, owner and storefront photos)',
  'Your bank or UPI payout details',
  'Your store listing, catalogue and store photos on Gloceries',
];

const KEPT =
  'Order, invoice, settlement and tax records are kept for as long as Indian law requires (usually up to 8 years), then deleted. They are not used for anything else.';

function statusText(request: DeletionRequest, isOwner: boolean): string {
  if (request.status === 'resolved') return 'Your last request was closed by our team. You can send a new one below.';
  const closed = isOwner ? ' Your store has been closed and will not receive new orders.' : '';
  return `We have your request. Our team will verify it and delete your account within 30 days.${closed}`;
}

export function DeleteAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const isOwner = useStoreProfileStore((s) => s.profile.accessRole !== 'manager');
  const loadProfile = useStoreProfileStore((s) => s.loadProfile);
  const [reason, setReason] = useState('');

  const { data: request, isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchDeletionRequest });
  const pending = request != null && request.status !== 'resolved';

  const mutation = useMutation({
    mutationFn: () => requestAccountDeletion(reason),
    onSuccess: (created) => {
      queryClient.setQueryData(QUERY_KEY, created);
      // The server closed the store; reload so the Open/Closed toggle agrees.
      void loadProfile();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Could not send your request. Check your connection and try again.';
      Alert.alert('Request not sent', message);
    },
  });

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      isOwner
        ? 'Your store will be closed right away and stop receiving orders. This cannot be undone once our team completes it.'
        : 'Your access to this store will end. This cannot be undone once our team completes it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request deletion', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-safe-offset-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-[18px] font-bold text-ink">Delete account</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-12 pt-2" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <AppIcon icon={Delete02Icon} size={26} color={colors.danger} />
          </View>

          {request ? (
            <View className={`rounded-[16px] px-4 py-3 ${pending ? 'bg-gold/15' : 'bg-gray-100'}`}>
              <Text className="text-[14px] font-semibold text-ink">{pending ? 'Deletion requested' : 'Previous request closed'}</Text>
              <Text className="mt-1 text-[14px] leading-5 text-ink/70">{statusText(request, isOwner)}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-[16px] font-bold text-ink">What gets deleted</Text>
            {DELETED.map((item) => (
              <Text key={item} className="mt-2 text-[14px] leading-5 text-ink/70">•  {item}</Text>
            ))}
          </View>

          <View>
            <Text className="text-[16px] font-bold text-ink">What we must keep</Text>
            <Text className="mt-2 text-[14px] leading-5 text-ink/70">{KEPT}</Text>
          </View>

          <View>
            <Text className="text-[16px] font-bold text-ink">Before you ask</Text>
            <Text className="mt-2 text-[14px] leading-5 text-ink/70">
              Finish every active order (placed, packed or out for delivery). Any settlement still due will be paid to your payout account on file.
            </Text>
          </View>

          {!pending ? (
            <>
              <View>
                <Text className="mb-2 text-[14px] font-semibold text-ink">Reason (optional)</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  maxLength={MAX_REASON}
                  multiline
                  placeholder="Tell us why you are leaving"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[96px] rounded-[13px] border px-3.5 py-3 text-[15px] text-ink"
                  style={{ borderColor: CARD_BORDER, textAlignVertical: 'top' }}
                />
              </View>
              <PrimaryButton label="Request account deletion" onPress={confirm} loading={mutation.isPending} />
            </>
          ) : null}

          <Text className="text-[13px] leading-5 text-ink/50">
            You can also request deletion on the web at gloceries.com/delete-account.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
