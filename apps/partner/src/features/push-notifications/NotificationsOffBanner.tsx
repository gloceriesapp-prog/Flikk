// In-app warning when push registration failed or permission is denied — the
// one case where a backgrounded owner gets ZERO signal for a new order (push is
// the only channel that reaches them when they're not looking, and polling only
// runs with the app open). registerPushToken records the outcome into
// useNotificationStatusStore; this surfaces it as a slim top banner, same
// placement as OrderReminderBanner / OfflineBanner. Dismissible but recurring:
// a dismiss hides it until the next foreground re-check (App.tsx's AppState
// handler re-runs registration and clears the dismiss), so a still-off
// permission comes back rather than being silenced for good.
import { NotificationOff01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { useNotificationStatusStore, pushStatusWarns } from '../../store/useNotificationStatusStore';

export function NotificationsOffBanner() {
  const status = useNotificationStatusStore((s) => s.status);
  const dismissed = useNotificationStatusStore((s) => s.dismissed);
  const dismiss = useNotificationStatusStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (!pushStatusWarns(status) || dismissed) return null;

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 rounded-2xl bg-danger px-4 py-3 shadow-lg shadow-black/20">
        <AppIcon icon={NotificationOff01Icon} size={18} color="#FFFFFF" />
        <Text className="flex-1 text-sm font-medium text-white" numberOfLines={2}>
          Notifications are off — you may miss orders. Turn them on in Settings.
        </Text>
        <Pressable onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss">
          <AppIcon icon={Cancel01Icon} size={16} color="#FFFFFFB3" />
        </Pressable>
      </View>
    </View>
  );
}
