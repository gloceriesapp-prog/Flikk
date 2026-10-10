// App-wide offline banner, bound to the shared onlineStore (@gloceries/shared)
// via React's own useSyncExternalStore — the SAME connectivity source that
// feeds react-query's onlineManager (wired once in App.tsx), so the banner and
// query pausing never disagree. Renders nothing while online; a thin, dismiss-
// free danger strip pinned below the status bar while offline. Unobtrusive by
// design — it informs, it doesn't block.

import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onlineStore } from '../network/online';
import { colors } from '../theme/tokens';

export function OfflineBanner() {
  const online = useSyncExternalStore(onlineStore.subscribe, onlineStore.getSnapshot);
  const insets = useSafeAreaInsets();
  if (online) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top, backgroundColor: colors.danger, zIndex: 100 }}
    >
      <Text className="py-1.5 text-center text-xs font-semibold text-white">No internet connection</Text>
    </View>
  );
}
