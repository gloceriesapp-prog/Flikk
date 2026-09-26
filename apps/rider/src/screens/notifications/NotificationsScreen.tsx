// Alerts tab — honest empty state. Dispatch offers arrive as push + Home's
// "Pickups near you" list; there's no stored notification feed yet, so this
// shows a real "nothing here" rather than fake rows. When a persisted feed
// exists, render it here.
// ponytail: empty-state only, wire a real list when a notifications table lands.

import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconlyNotification } from '../../components/icons/iconly';
import { colors } from '../../theme/tokens';

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#fbfafa]">
      <Text style={{ paddingTop: insets.top + 16 }} className="px-5 pb-2 text-[22px] font-semibold text-ink">
        Alerts
      </Text>
      <View className="flex-1 items-center justify-center px-10">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F1F1F4]">
          <IconlyNotification size={28} color={`${colors.ink}66`} />
        </View>
        <Text className="mt-4 text-[16px] font-semibold text-ink/70">No alerts yet</Text>
        <Text className="mt-1 text-center text-[13px] font-medium text-ink/40">
          New pickups and updates will show up here.
        </Text>
      </View>
    </View>
  );
}
