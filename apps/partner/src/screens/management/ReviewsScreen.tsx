import { useRef, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { managementApi, type Review } from '../../api/management';
import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import { ManagementPage, ManagementButton, failureMessage } from './ManagementPage';

function ReviewCard({ review }: { review: Review }) {
  const [reply, setReply] = useState(review.owner_reply ?? '');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const client = useQueryClient();
  const scope = usePrivateQueryScope();

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    const epoch = getSessionEpoch();
    try {
      await managementApi.reply(review.id, reply);
      if (!isCurrentSession(epoch)) return;
      await client.invalidateQueries({ queryKey: ['partner-reviews', scope] });
      if (isCurrentSession(epoch)) Alert.alert('Reply saved');
    } catch (error) {
      if (isCurrentSession(epoch)) Alert.alert('Reply not saved', failureMessage(error));
    } finally {
      busy.current = false;
      if (isCurrentSession(epoch)) setSaving(false);
    }
  }

  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <Text className="font-semibold">{review.users?.name ?? 'Customer'} · {review.rating}/5</Text>
      <Text>{review.comment || 'No written comment'}</Text>
      <TextInput accessibilityLabel="Your reply" editable={!saving} multiline maxLength={1000} value={reply} onChangeText={setReply}
        placeholder="Thank your customer or offer help" className="rounded-xl border border-gray-200 p-3" />
      <ManagementButton disabled={saving} label={saving ? 'Saving reply…' : 'Save reply'} onPress={() => void save()} />
    </View>
  );
}

export function ReviewsScreen() {
  const scope = usePrivateQueryScope();
  const query = useInfiniteQuery({
    queryKey: ['partner-reviews', scope],
    queryFn: ({ pageParam }) => managementApi.reviews(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 60_000,
  });
  return (
    <ManagementPage title="Customer reviews" scroll={false}>
      <FlatList
        data={query.data?.pages.flatMap(page => page.items) ?? []}
        keyExtractor={review => review.id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        ListHeaderComponent={query.isError ? (
          <View className="gap-3">
            <Text>Reviews could not refresh. Saved reviews remain below.</Text>
            <ManagementButton label="Retry" onPress={() => void query.refetch()} />
          </View>
        ) : null}
        ListEmptyComponent={<Text>{query.isPending ? 'Gathering your customers’ words…' : query.isError ? 'Reviews are temporarily unavailable.' : 'Your first review will appear here.'}</Text>}
        ListFooterComponent={query.hasNextPage ? <ManagementButton disabled={query.isFetchingNextPage} label="More reviews" onPress={() => void query.fetchNextPage()} /> : null}
      />
    </ManagementPage>
  );
}
