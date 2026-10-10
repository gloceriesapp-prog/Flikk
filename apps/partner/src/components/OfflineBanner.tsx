// App-wide offline banner. Reads the headless onlineStore via React's own
// useSyncExternalStore (shared can't ship a hook — it has no React dep, see
// onlineStore.ts). Mounted once at the app root so it explains a stale order
// queue regardless of which tab is focused: partner's loadOrders poll fails
// silently when the network drops, so without this the queue just looks frozen.
// Slim top banner, same placement/shape as OrderReminderBanner (not a
// full-screen interrupt — that's reserved for a new order).
import { useSyncExternalStore } from 'react';
import { WifiDisconnected01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onlineStore } from '../network/online';
import { AppIcon } from './AppIcon';

export function OfflineBanner() {
  const online = useSyncExternalStore(onlineStore.subscribe, onlineStore.getSnapshot);
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 rounded-2xl bg-ink px-4 py-3 shadow-lg shadow-black/20">
        <AppIcon icon={WifiDisconnected01Icon} size={18} color="#FFFFFF" />
        <Text className="flex-1 text-sm font-medium text-white" numberOfLines={2}>
          You are offline — orders may be out of date until you reconnect.
        </Text>
      </View>
    </View>
  );
}
