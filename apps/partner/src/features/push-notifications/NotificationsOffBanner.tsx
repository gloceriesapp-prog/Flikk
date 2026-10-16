// Android asks through the system first, then shows a dismissible native
// explanation only after denial. Token/network failures are not denial.
import { NotificationOff01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useEffect } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { useNotificationStatusStore, pushStatusWarns } from '../../store/useNotificationStatusStore';

export function NotificationsOffBanner() {
  const status = useNotificationStatusStore((s) => s.status);
  const dismissed = useNotificationStatusStore((s) => s.dismissed);
  const dismiss = useNotificationStatusStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'android' || status !== 'denied' || dismissed) return;
    // Mark handled before showing the dialog, including while Settings
    // backgrounds the app. Foreground checks must not create a popup loop.
    dismiss();
    Alert.alert(
      'Notifications are off',
      'You may miss new orders. You can enable notifications in your phone Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          void Linking.openSettings().catch(() => Alert.alert('Could not open Settings', 'Open your phone Settings, select Gloceries Partner, then Notifications.'));
        } },
      ],
      { cancelable: true },
    );
  }, [status, dismissed, dismiss]);

  if (Platform.OS === 'android' || !pushStatusWarns(status) || dismissed) return null;

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 rounded-2xl bg-danger px-4 py-3 shadow-lg shadow-black/20">
        <AppIcon icon={NotificationOff01Icon} size={18} color="#FFFFFF" />
        <Text className="flex-1 text-sm font-medium text-white" numberOfLines={2}>
          {status === 'denied' ? 'Notifications are off. Turn them on in Settings.' : 'Order alerts could not connect. Please check your connection.'}
        </Text>
        <Pressable onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss">
          <AppIcon icon={Cancel01Icon} size={16} color="#FFFFFFB3" />
        </Pressable>
      </View>
    </View>
  );
}
