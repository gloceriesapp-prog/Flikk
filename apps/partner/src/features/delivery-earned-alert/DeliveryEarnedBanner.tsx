// The in-app half of delivery-earned transparency — a slim top banner,
// same shape/pattern as order-expiry's own OrderReminderBanner (auto-
// dismisses, tapping it also dismisses early and jumps straight to the
// order that just earned this). Mounted once at the app root (App.tsx) so
// it can appear over whichever tab is focused.
//
// Real numbers only — netEarned/payoutDateLabel both come from
// useDeliveryEarnedWatcher.ts, which reads them off the actual delivered
// order (PartnerOrder.netPayout) and the real settlement schedule
// (utils/nextPayoutDate.ts), never a guess made here.

import { useEffect } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { navigationRef } from '../../navigation/navigationRef';
import { useDeliveryEarnedAlertStore } from './useDeliveryEarnedAlertStore';

const AUTO_DISMISS_MS = 6000;

export function DeliveryEarnedBanner() {
  const activeEarning = useDeliveryEarnedAlertStore((state) => state.activeEarning);
  const dismissEarning = useDeliveryEarnedAlertStore((state) => state.dismissEarning);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!activeEarning) return;
    const timeout = setTimeout(dismissEarning, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [activeEarning, dismissEarning]);

  if (!activeEarning) return null;

  function handlePress() {
    if (!activeEarning) return;
    const { orderId } = activeEarning;
    dismissEarning();
    if (navigationRef.isReady()) navigationRef.navigate('OrderDetail', { orderId });
  }

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        onPress={handlePress}
        className="flex-row items-center gap-3 rounded-2xl bg-success px-4 py-3 shadow-lg shadow-black/20"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <AppIcon icon={CheckmarkCircle02Icon} size={20} color="#FFFFFF" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-white">₹{activeEarning.netEarned.toLocaleString('en-IN')} earned</Text>
          <Text className="mt-0.5 text-xs font-medium text-white/85" numberOfLines={2}>
            Order {activeEarning.orderNumber} delivered — added to your balance, paid out on {activeEarning.payoutDateLabel}.
          </Text>
        </View>
        <Pressable onPress={dismissEarning} hitSlop={8}>
          <AppIcon icon={Cancel01Icon} size={16} color="#FFFFFFB3" />
        </Pressable>
      </Pressable>
    </View>
  );
}
