// In-app account deletion request (Google Play requires one). Explains what
// is deleted and what the law makes us keep, then files the request with
// POST /rider/account/deletion-request. Admin completes it from the Support
// inbox. The backend refuses while the rider still holds an active delivery
// or unsettled cash and says why; that message is shown as is.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { ApiError } from '../../api/client';
import { fetchDeletionRequest, requestAccountDeletion, type DeletionRequest } from '../../api/accountDeletion';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';

const QUERY_KEY = ['riderDeletionRequest'] as const;
const MAX_REASON = 500;

const DELETED = [
  'Your rider profile, phone number and login',
  'Your ID documents (Aadhaar, driving licence) and profile photo',
  'Your bank or UPI payout details',
  'Your saved working hours and app settings',
];

const KEPT = 'Delivery, earnings, payout and tax records are kept for as long as Indian law requires (usually up to 8 years), then deleted. They are not used for anything else.';

function statusText(request: DeletionRequest): string {
  if (request.status === 'resolved') return 'Your last request was closed by our team. You can send a new one below.';
  return 'We have your request. Our team will verify it and delete your account within 30 days. You have been taken offline and will not get new delivery offers.';
}

export function DeleteAccountScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const [reason, setReason] = useState('');

  const { data: request, isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchDeletionRequest });
  const pending = request != null && request.status !== 'resolved';

  const mutation = useMutation({
    mutationFn: () => requestAccountDeletion(reason),
    onSuccess: (created) => {
      queryClient.setQueryData(QUERY_KEY, created);
      // The server already set the rider offline; mirror it locally so the
      // ping loop stops and the UI agrees.
      goOffline();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Could not send your request. Check your connection and try again.';
      Alert.alert('Request not sent', message);
    },
  });

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      'You will be taken offline right away and stop receiving delivery offers. This cannot be undone once our team completes it.',
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
          <ActivityIndicator color={colors.limeDeep} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-2" keyboardShouldPersistTaps="handled">
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.danger}14` }}>
            <AppIcon icon={Delete02Icon} size={26} color={colors.danger} />
          </View>

          {request ? (
            <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: pending ? colors.limeSoft : colors.mist }}>
              <Text className="text-[14px] font-semibold text-ink">{pending ? 'Deletion requested' : 'Previous request closed'}</Text>
              <Text className="mt-1 text-[14px] leading-5 text-ink/70">{statusText(request)}</Text>
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
              Finish or hand back any active delivery and deposit any cash you collected. Any earnings still due will be paid to your account on file.
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
                  className="min-h-[96px] rounded-2xl border px-4 py-3 text-[15px] text-ink"
                  style={{ borderColor: '#EAECEE', textAlignVertical: 'top' }}
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
