// Alerts tab — the rider's real persisted notification feed (GET
// /rider/notifications): assignment pings, partner approval/rejection, and
// general account alerts, newest first. Fetches on focus and on pull-to-
// refresh; marks everything read once per visit (and clears the unread
// marks locally so they don't linger for a round trip). Background feed, so
// failures stay silent — the rider gets no error toast for a list they
// didn't explicitly ask to reload; a failed fetch just keeps the last-good
// (or empty) state. The original zero-notifications empty state below is
// unchanged — it's still exactly what shows when the feed is genuinely empty.

import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconlyNotification } from '../../components/icons/iconly';
import { colors } from '../../theme/tokens';
import { formatDayLabel } from '../../utils/date';
import { fetchNotifications, markNotificationsRead, type RiderNotification } from '../../api/notifications';

// "now" / "5m" / "2h" / "3d", then the "Mon, 12 Aug" day label past a week —
// hand-rolled for the same reason date.ts's other formatters are (Hermes
// ships no full ICU, and RelativeTimeFormat with it).
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return formatDayLabel(iso);
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [loading, setLoading] = useState(true); // first-load spinner only
  const [refreshing, setRefreshing] = useState(false);
  // One mark-read call per focused visit — reset on each focus so a fresh
  // visit re-marks whatever arrived since, but a re-render mid-visit doesn't
  // loop the PATCH.
  const markedThisFocus = useRef(false);

  const load = useCallback(async (isRefresh: boolean) => {
    try {
      const { notifications: rows } = await fetchNotifications();
      setNotifications(rows);
      if (!markedThisFocus.current && rows.some((n) => n.readAt === null)) {
        markedThisFocus.current = true;
        const now = new Date().toISOString();
        // Reflect read locally so the unread marks clear immediately; the
        // PATCH is fire-and-forget — if it fails the next focus retries.
        markNotificationsRead().catch(() => {});
        setNotifications((prev) => prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)));
      }
    } catch {
      // Silent, same as the app's other poll failures — keep last-good/empty.
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      markedThisFocus.current = false;
      load(false);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // A manual refresh is a fresh chance to clear any new unread too.
    markedThisFocus.current = false;
    load(true);
  }, [load]);

  return (
    <View className="flex-1 bg-[#fbfafa]">
      <Text style={{ paddingTop: insets.top + 16 }} className="px-5 pb-2 text-[22px] font-semibold text-ink">
        Alerts
      </Text>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 px-5 pb-28 pt-2"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
          renderItem={({ item }) => <NotificationRow item={item} />}
        />
      )}
    </View>
  );
}

function NotificationRow({ item }: { item: RiderNotification }) {
  const unread = item.readAt === null;
  return (
    // Unread rows get a lime-soft tinted surface + a lime dot; read rows are
    // plain white — brand tokens only, no new hues.
    <View className={`flex-row gap-3 rounded-2xl px-4 py-3.5 ${unread ? 'bg-limeSoft' : 'bg-white'}`}>
      <View className="w-2 pt-1.5">
        {unread ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.lime }} /> : null}
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-[14.5px] font-semibold text-ink" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-[12px] font-medium text-ink/40" style={{ fontVariant: ['tabular-nums'] }}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        <Text className="mt-0.5 text-[13px] font-medium text-ink/55">{item.body}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F1F1F4]">
        <IconlyNotification size={28} color={`${colors.ink}66`} />
      </View>
      <Text className="mt-4 text-[16px] font-semibold text-ink/70">No alerts yet</Text>
      <Text className="mt-1 text-center text-[13px] font-medium text-ink/40">
        New pickups and updates will show up here.
      </Text>
    </View>
  );
}
