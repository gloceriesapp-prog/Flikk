import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { managementApi } from '../../api/management';
import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import type { AppStackParamList } from '../../navigation/types';
import { ManagementPage, ManagementButton, failureMessage } from './ManagementPage';

export function StaffScreen() {
  const scope = usePrivateQueryScope();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const query = useInfiniteQuery({
    queryKey: ['partner-team', scope],
    queryFn: ({ pageParam }) => managementApi.team(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
  });
  const [removing, setRemoving] = useState<string | null>(null);
  const busy = useRef(false);

  async function remove(id: string) {
    if (busy.current) return;
    busy.current = true;
    setRemoving(id);
    const epoch = getSessionEpoch();
    try {
      await managementApi.remove(id);
      if (isCurrentSession(epoch)) await query.refetch();
    } catch (error) {
      if (isCurrentSession(epoch)) Alert.alert('Member not removed', failureMessage(error));
    } finally {
      busy.current = false;
      if (isCurrentSession(epoch)) setRemoving(null);
    }
  }

  function confirmRemove(id: string) {
    Alert.alert('Remove manager?', 'Their store access will end immediately.', [
      { text: 'Keep access', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void remove(id) },
    ]);
  }

  return (
    <ManagementPage title="Store team">
      <Text>Managers can handle orders, products and reviews. Legal details and payouts stay with the owner.</Text>
      {query.isPending && <Text>Finding your team…</Text>}
      {query.isError && (
        <View className="gap-3">
          <Text>Team access could not refresh. The list below may be out of date.</Text>
          <ManagementButton label="Retry team" onPress={() => void query.refetch()} />
        </View>
      )}
      {query.data?.pages.flatMap(page => page.items).map(member => (
        <View key={member.user_id} className="gap-3 rounded-2xl bg-white p-4">
          <Text className="font-semibold">{member.users?.name ?? 'Store manager'}</Text>
          <ManagementButton disabled={removing !== null} label={removing === member.user_id ? 'Removing…' : 'Remove access'} onPress={() => confirmRemove(member.user_id)} />
        </View>
      ))}
      {query.data?.pages[0].items.length === 0 && <Text>No managers have been assigned yet.</Text>}
      {query.hasNextPage && <ManagementButton disabled={query.isFetchingNextPage} label="More team members" onPress={() => void query.fetchNextPage()} />}
      <Text>New managers are approved by Gloceries. Include their registered mobile number in your request.</Text>
      <ManagementButton label="Request a manager" onPress={() => navigation.navigate('Support', { compose: true })} />
    </ManagementPage>
  );
}
