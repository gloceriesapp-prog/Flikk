import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { AppStackParamList } from '../../navigation/types';
type Props = NativeStackScreenProps<AppStackParamList, 'AccountPrivacy'>;
interface DeletionRequest { id: string; status: string; review_note: string | null }
export function AccountPrivacyScreen({ navigation }: Props) {
  const customerId = useAuthStore(s => s.customerId); const [reason, setReason] = useState(''); const client = useQueryClient();
  const query = useQuery({ queryKey: ['privacy', 'deletion', customerId], enabled: !!customerId, queryFn: () => apiRequest<DeletionRequest | null>('/privacy/deletion-request') });
  const mutation = useMutation({ mutationFn: () => apiRequest('/privacy/deletion-request', { method: 'POST', body: { reason } }),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['privacy', 'deletion', customerId] }); },
    onError: () => Alert.alert('Request not confirmed', 'Please retry to check your request. Repeated submissions keep the same open request.') });
  const pending = query.data && ['pending', 'approved'].includes(query.data.status);
  return <View className="flex-1 bg-[#F5F6F8] pt-safe">
    <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} className="px-5 py-4"><Text className="font-semibold text-[#155DFC]">‹ Back</Text></Pressable>
    <ScrollView contentContainerClassName="gap-5 px-5 pb-safe-offset-6">
      <Text className="text-2xl font-bold text-ink">Your account & privacy</Text>
      <View className="gap-3 rounded-2xl bg-white p-5"><Text className="text-lg font-bold text-ink">Your information</Text><Text className="text-base leading-6 text-ink/65">Your saved addresses, profile and order details support delivery and customer care. You can manage addresses and profile details from your account.</Text></View>
      <View className="gap-4 rounded-2xl bg-white p-5"><Text className="text-lg font-bold text-ink">Request account deletion</Text><Text className="text-base leading-6 text-ink/65">Our team reviews the request after active orders, refunds and support issues are resolved. Approval disables sign-in and removes reusable profile data. Historical order and payment records are retained.</Text>
        {query.isPending ? <Text>Loading your request…</Text> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text className="text-[#155DFC]">Couldn’t check your request. Tap to retry.</Text></Pressable> : <>
          {query.data && <Text className="font-semibold text-ink">Status: {query.data.status}{query.data.review_note ? `\n${query.data.review_note}` : ''}</Text>}
          {!pending && customerId && <><TextInput accessibilityLabel="Optional deletion reason" multiline maxLength={1000} value={reason} onChangeText={setReason} placeholder="Reason (optional)" className="min-h-20 rounded-xl border border-gray-200 p-3 text-ink" /><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => Alert.alert('Request account deletion?', 'This sends a request to our team. Your active orders will remain accessible during review.', [{ text: 'Keep account', style: 'cancel' }, { text: 'Send request', style: 'destructive', onPress: () => mutation.mutate() }])} className="rounded-xl bg-coral py-3"><Text className="text-center font-bold text-ink">{mutation.isPending ? 'Sending…' : 'Request deletion'}</Text></Pressable></>}
        </>}
      </View>
    </ScrollView>
  </View>;
}
