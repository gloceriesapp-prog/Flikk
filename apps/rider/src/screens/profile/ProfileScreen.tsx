// Rider's own account screen — phone is the real identity a session has
// (api/auth.ts's own note on why there's no name/vehicle/rating data
// yet); the name shown is DUMMY_RIDER_NAME (data/appConfig.ts), a
// placeholder until real onboarding data exists, same as Home's greeting.
// Performance/Completion/Rating moved here from Home — a checked-
// occasionally trust signal, not something a rider needs mid-shift every
// time they glance at the dashboard (Home's own note on why it left).
// Log out is the one real, functional action here.

import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { Call02Icon, CustomerService01Icon, Logout01Icon, MessageQuestionIcon, UserIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../data/support';
import { DUMMY_RIDER_NAME } from '../../data/appConfig';
import { computePerformanceStats } from '../../utils/performance';
import { PerformanceRow } from '../../components/PerformanceRow';

export function ProfileScreen() {
  const phone = useAuthStore((s) => s.phone);
  const clear = useAuthStore((s) => s.clear);
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const cancelledOrders = useRiderOrdersStore((s) => s.cancelledOrders);
  const performanceStats = computePerformanceStats(completedOrders, cancelledOrders);

  function handleLogout() {
    Alert.alert('Log out?', 'You\'ll need to verify your number again to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          goOffline();
          void clear();
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white px-5 pb-4 pt-safe-offset-4">
        <Text className="text-xl font-bold text-ink">Profile</Text>
      </View>

      <View className="gap-4 px-5 pb-28 pt-5">
        <View className="items-center gap-3 rounded-3xl bg-white py-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-lime-soft">
            <AppIcon icon={UserIcon} size={26} color={colors.limeDeep} />
          </View>
          <View className="items-center gap-0.5">
            <Text className="text-lg font-bold text-ink">{DUMMY_RIDER_NAME}</Text>
            <View className="flex-row items-center gap-1.5">
              <AppIcon icon={Call02Icon} size={13} color={`${colors.ink}70`} />
              <Text className="text-[13px] text-ink/55">{phone ?? '—'}</Text>
            </View>
          </View>
        </View>

        <PerformanceRow stats={performanceStats} />

        <View className="gap-2 rounded-2xl bg-white p-2">
          <Text className="px-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink/40">Support</Text>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-soft">
              <AppIcon icon={CustomerService01Icon} size={16} color={colors.limeDeep} />
            </View>
            <Text className="flex-1 text-[14px] font-semibold text-ink">Call support</Text>
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Rider%20app%20issue`)}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-soft">
              <AppIcon icon={MessageQuestionIcon} size={16} color={colors.limeDeep} />
            </View>
            <Text className="flex-1 text-[14px] font-semibold text-ink">Report an issue</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-danger/30 py-3.5"
        >
          <AppIcon icon={Logout01Icon} size={16} color={colors.danger} />
          <Text className="text-[14px] font-semibold text-danger">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
