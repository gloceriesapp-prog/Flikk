// The in-app half of a reminder — a slim top banner, not another
// full-screen interrupt (that's IncomingOrderAlert's job, reserved for the
// initial "new order" moment). Mounted once at the app root (App.tsx) so
// it can appear over whichever tab is focused, same reasoning as
// IncomingOrderAlert. Auto-dismisses after a few seconds; tapping it also
// dismisses early and jumps to the Orders tab via navigationRef, same
// pattern useIncomingOrderAlert.ts uses to navigate from outside
// AppNavigator's own tree.

import { useEffect } from 'react';
import { AlarmClockIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { navigationRef } from '../../../navigation/navigationRef';
import { useOrderReminderStore } from '../useOrderReminderStore';

const AUTO_DISMISS_MS = 5000;

const STAGE_COPY = {
  first: (customerName: string) => `${customerName}'s order is still waiting to be accepted.`,
  final: (customerName: string) => `${customerName}'s order will auto-reject soon — accept it now.`,
} as const;

export function OrderReminderBanner() {
  const activeReminder = useOrderReminderStore((state) => state.activeReminder);
  const dismissReminder = useOrderReminderStore((state) => state.dismissReminder);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!activeReminder) return;
    const timeout = setTimeout(dismissReminder, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [activeReminder, dismissReminder]);

  if (!activeReminder) return null;

  const isFinal = activeReminder.stage === 'final';

  function handlePress() {
    dismissReminder();
    if (navigationRef.isReady()) navigationRef.navigate('Orders');
  }

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        onPress={handlePress}
        className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-lg shadow-black/20 ${
          isFinal ? 'bg-danger' : 'bg-ink'
        }`}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <AppIcon icon={AlarmClockIcon} size={18} color="#FFFFFF" />
        <Text className="flex-1 text-sm font-medium text-white" numberOfLines={2}>
          {STAGE_COPY[activeReminder.stage](activeReminder.customerName)}
        </Text>
        <Pressable onPress={dismissReminder} hitSlop={8}>
          <AppIcon icon={Cancel01Icon} size={16} color="#FFFFFFB3" />
        </Pressable>
      </Pressable>
    </View>
  );
}
