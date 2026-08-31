// Full-screen "new order" interrupt — mounted outside the tab navigator
// in App.tsx (same convention apps/partner uses for its own version) so a
// new assignment can interrupt whichever tab is currently focused, not
// just whichever screen happens to be watching useRiderOrdersStore.
// Driven entirely by store.incomingOrder (set locally by
// useRiderOrdersStore's own mock timer — see that file's note on why
// there's no real polling yet).
//
// Three layers make sure this can't be silently missed:
// 1. Repeating vibration (native Vibration API, no dep) while the modal
//    is up — stops the instant accept/decline/timeout clears the order.
// 2. An OS local notification (notifyIncomingOrder.ts) — reaches the
//    rider even if the app is backgrounded, which the modal alone can't.
// 3. A countdown ring (CountdownRing.tsx) tied to the store's own
//    incomingOrderExpiresAt — matches ACCEPT_WINDOW_SECONDS, so the ring
//    and the store's own auto-decline timer never drift apart.

import { useEffect } from 'react';
import { Modal, Pressable, Text, Vibration, View } from 'react-native';
import { Location01Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { CountdownRing } from '../../components/CountdownRing';
import { colors } from '../../theme/tokens';
import { ACCEPT_WINDOW_SECONDS, useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { notifyIncomingOrder } from './notifyIncomingOrder';

// Buzz, pause, buzz, pause, repeating — noticeably distinct from a single
// short tap-feedback buzz, so it reads as "act now," not as background
// noise.
const VIBRATION_PATTERN = [0, 400, 200, 400, 200];

export function IncomingOrderAlert() {
  const order = useRiderOrdersStore((s) => s.incomingOrder);
  const expiresAt = useRiderOrdersStore((s) => s.incomingOrderExpiresAt);
  const acceptIncomingOrder = useRiderOrdersStore((s) => s.acceptIncomingOrder);
  const declineIncomingOrder = useRiderOrdersStore((s) => s.declineIncomingOrder);

  useEffect(() => {
    if (!order) return;

    Vibration.vibrate(VIBRATION_PATTERN, true);
    notifyIncomingOrder(order).catch(() => {});

    return () => Vibration.cancel();
    // Keyed on order.id, not the whole order object — a re-render with
    // the same pending order shouldn't restart the vibration/notification
    // from scratch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  return (
    <Modal visible={!!order} transparent animationType="fade" statusBarTranslucent>
      {order ? (
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full gap-5 rounded-3xl bg-white p-6">
            <View className="flex-row items-center justify-between">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-lime-soft">
                <AppIcon icon={PackageIcon} size={24} color={colors.limeDeep} />
              </View>
              {expiresAt ? <CountdownRing deadlineMs={expiresAt} totalMs={ACCEPT_WINDOW_SECONDS * 1000} /> : null}
            </View>
            <View className="-mt-2 items-center gap-1">
              <Text className="text-xl font-bold text-ink">New order request</Text>
              <Text className="text-[13px] text-ink/50">{order.orderNumber}</Text>
            </View>

            <View className="gap-3 rounded-2xl bg-mist p-4">
              <View className="flex-row items-center gap-2.5">
                <AppIcon icon={Store01Icon} size={16} color={colors.limeDeep} />
                <Text className="flex-1 text-[13.5px] font-semibold text-ink" numberOfLines={1}>
                  {order.storeName}
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <AppIcon icon={Location01Icon} size={16} color={colors.coral} />
                <Text className="flex-1 text-[13.5px] font-semibold text-ink" numberOfLines={1}>
                  {order.customerAddress}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between px-1">
              <Text className="text-[13px] text-ink/50">{order.itemCount} items · {order.distanceKm} km</Text>
              <Text className="text-lg font-bold text-ink">₹{order.payout}</Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable onPress={declineIncomingOrder} className="flex-1 items-center rounded-2xl border border-gray-200 py-4">
                <Text className="text-base font-semibold text-ink">Decline</Text>
              </Pressable>
              <Pressable onPress={acceptIncomingOrder} className="flex-1 items-center rounded-2xl bg-lime-deep py-4">
                <Text className="text-base font-semibold text-ink">Accept</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
