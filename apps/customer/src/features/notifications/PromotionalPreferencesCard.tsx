import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { apiRequest } from '../../api/client';

type Preferences = { sms: boolean; push: boolean; email: boolean };
const CHANNELS: { key: keyof Preferences; label: string; description: string }[] = [
  { key: 'sms', label: 'Promotional SMS', description: 'Offers and savings by text message' },
  { key: 'push', label: 'Promotional notifications', description: 'Offers and new arrivals on your phone' },
  { key: 'email', label: 'Promotional emails', description: 'Offers and updates in your inbox' },
];

export function PromotionalPreferencesCard() {
  const customerId = useAuthStore(s => s.customerId);
  const client = useQueryClient();
  const key = ['notification-preferences', customerId];
  const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: key, queryFn: () => apiRequest<Preferences>('/notifications/preferences'), enabled: !!customerId });
  const save = useMutation({
    mutationFn: (preferences: Preferences) => apiRequest<Preferences>('/notifications/preferences', { method: 'PATCH', body: preferences }),
    onSuccess: preferences => { client.setQueryData(key, preferences); setMessage('Preferences saved.'); },
    onError: () => setMessage('Could not save your preferences. Please try again.'),
  });
  return (
    <View className="mx-5 mb-4 rounded-2xl bg-white p-4">
      <Text className="text-base font-semibold text-ink">Offers & updates</Text>
      <Text className="mt-1 mb-2 text-sm text-gray-500">Choose how you hear about promotions. Order updates stay separate.</Text>
      {CHANNELS.map(channel => (
        <View key={channel.key} className="flex-row items-center gap-3 py-3">
          <View className="flex-1">
            <Text className="font-semibold text-ink">{channel.label}</Text>
            <Text className="mt-1 text-xs text-gray-500">{channel.description}</Text>
          </View>
          <Switch accessibilityLabel={channel.label} value={query.data?.[channel.key] ?? true}
            disabled={!query.data || save.isPending} trackColor={{ false: '#D1D5DB', true: '#155DFC' }} thumbColor="#FFFFFF"
            onValueChange={value => {
              if (!query.data || save.isPending) return;
              setMessage('');
              save.mutate({ ...query.data, [channel.key]: value });
            }} />
        </View>
      ))}
      {query.isError && <Text onPress={() => void query.refetch()} className="text-sm text-red-600">Could not load preferences. Tap to retry.</Text>}
      {save.isPending && <Text className="text-sm text-gray-500">Saving…</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" className="text-sm text-gray-600">{message}</Text>}
    </View>
  );
}
