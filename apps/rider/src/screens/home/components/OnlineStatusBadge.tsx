// Small non-button online/offline badge — reads the real isOnline flag from
// the store so it always reflects the live toggle state (goOnline/goOffline),
// no prop to keep in sync. Used at the right end of the "Today's Earnings"
// card on both the live and offline home so the rider sees their shift state
// right next to the money. Plain indicator, never pressable.

import { Text, View } from 'react-native';
import { useRiderOrdersStore } from '../../../store/useRiderOrdersStore';

const ONLINE_GREEN = '#00a63e';
const OFFLINE_GRAY = '#9AA0A6';

export function OnlineStatusBadge() {
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: isOnline ? '#E7F6EC' : '#F1F2F4' }}
    >
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: isOnline ? ONLINE_GREEN : OFFLINE_GRAY }} />
      <Text className="text-[12px] font-semibold" style={{ color: isOnline ? ONLINE_GREEN : OFFLINE_GRAY }}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}
