import { AppImage as Image } from '../../components/AppImage';
// Full-screen "new order" interrupt — pulled in at the app root (App.tsx),
// not part of AppNavigator's stack, so it can appear over whichever tab
// the shop owner is on. RN's core Modal, fully opaque and deliberately not
// dismissible except by Accept/Decline/auto-decline.
//
// Sixth pass. No ScrollView anymore — a full-screen interrupt that needs
// scrolling to see its own action buttons is a layout bug, not a feature;
// this now has to fit in one viewport by construction. That's what forced
// trimming the badge/confetti (pure decoration competing for the same
// vertical space as the buttons) and the address/call button (see
// DeliverToSection.tsx — a name is enough to know who this is for, an
// address needs its own screen if a store owner ever needs to read it
// carefully). `justify-between` on the outer column distributes the three
// blocks (hero, card, actions) across whatever height is actually
// available — the same layout flexes correctly on a compact iPhone SE and
// a tall Android phone without either one needing to scroll or leaving a
// dead gap, which plain fixed margins can't do across both.

import { useState } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useIncomingOrderAlert } from './useIncomingOrderAlert';
import { useOrderPolling } from './useOrderPolling';
import { AutoRejectChip } from './components/AutoRejectChip';
import { DeliverToSection } from './components/DeliverToSection';
import { ItemsSection } from './components/ItemsSection';
import { OrderInfoRow } from './components/OrderInfoRow';

const HERO_IMAGE_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/app-images/order-alert.png';

export function IncomingOrderAlert() {
  useOrderPolling();
  const { activeOrder, secondsLeft, onAccept, onDecline } = useIncomingOrderAlert();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={activeOrder !== null} animationType="slide" statusBarTranslucent>
      {/* Manual insets, not <SafeAreaView> — SafeAreaView's automatic edge
          detection is unreliable inside a Modal (the Modal mounts a
          separate native view hierarchy that doesn't always inherit the
          surrounding SafeAreaProvider's measured insets), which is what
          caused the header to sit under the status bar/dynamic island on
          iOS earlier. Applying the same insets by hand here also keeps
          this identically aligned on Android, which has no dynamic island
          but does have its own status-bar/gesture-nav insets that need
          the same treatment. */}
      <View
        className="flex-1 items-center justify-between bg-white px-6"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {activeOrder && (
          <>
            <View className="items-center gap-1">
              {/* Just the image now — no badge, no confetti competing
                  with it or with the buttons for vertical space. Bigger
                  than the previous pass since there's nothing else
                  crowding this block anymore. */}
              <Image source={{ uri: HERO_IMAGE_URL }} className="h-64 w-64" resizeMode="contain" />

              <View className="flex-row items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
                <Text className="text-base font-medium text-lime-deep">Order Confirmation</Text>
              </View>

              <View className="items-center">
                <Text className="text-center text-[28px] font-medium text-ink">
                  New Order <Text className="text-lime-deep">Received!</Text>
                </Text>
                <Text className="mt-1 max-w-[280px] text-center text-base font-medium text-ink/50">
                  You have a new order. Accept it to start packing.
                </Text>
              </View>
            </View>

            {/* The one detail card — order id + countdown, time/type,
                deliver-to, items. Grouped, not scattered loose on the
                page, so it reads as one decision packet. */}
            <View className="w-full gap-4 rounded-[28px] bg-[#F9FAFB] p-5 shadow-black/5">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-sm font-medium text-ink/40">Order ID</Text>
                  <Text className="text-xl font-medium text-ink">{activeOrder.orderNumber}</Text>
                </View>
                <AutoRejectChip secondsLeft={secondsLeft} />
              </View>

              <View className="border-t border-black/5" />

              <View className="flex-row">
                <OrderInfoRow icon={Clock01Icon} label="Time" value={activeOrder.placedAtTime} />
                {/* Static — every Gloceries order is a delivery, per
                    CLAUDE.md scope (no pickup mode exists). */}
                <OrderInfoRow icon={DeliveryTruck01Icon} label="Type" value="Delivery" />
              </View>

              <View className="border-t border-black/5" />

              <DeliverToSection customerName={activeOrder.customerName} />

              <View className="border-t border-black/5" />

              <ItemsSection items={activeOrder.items} />
            </View>

            <OrderAlertActions onAccept={onAccept} onDecline={onDecline} />
          </>
        )}
      </View>
    </Modal>
  );
}

interface OrderAlertActionsProps {
  onAccept: () => void;
  onDecline: () => void;
}

// Pulled out only so the "just tapped Accept" micro-state (a brief label
// swap confirming the tap registered before the modal closes) doesn't
// clutter the parent's already-long return.
function OrderAlertActions({ onAccept, onDecline }: OrderAlertActionsProps) {
  const [justAccepted, setJustAccepted] = useState(false);

  function handleAccept() {
    setJustAccepted(true);
    setTimeout(onAccept, 260);
  }

  return (
    // One row, not stacked — Decline is the narrow opt-out, Accept is
    // the wide, dominant default action (flex-[2]), same weighting logic
    // as the earlier ring-based pass, now applied to a horizontal pair
    // instead of one on top of the other.
    <View className="w-full flex-row gap-3">
      <Pressable
        onPress={onDecline}
        disabled={justAccepted}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-4 shadow-sm shadow-black/5"
        style={({ pressed }) => ({ opacity: pressed || justAccepted ? 0.5 : 1 })}
      >
        {/* Icon sits in its own tinted badge now, not loose next to the
            label — matches the checkmark badge on Accept so the two
            buttons read as one designed pair, not a styled button next to
            a plain fallback one. */}
        <View className="h-6 w-6 items-center justify-center rounded-full bg-danger/10">
          <AppIcon icon={Cancel01Icon} size={12} color={colors.danger} />
        </View>
        <Text className="text-base font-medium text-ink">Reject</Text>
      </Pressable>

      <Pressable
        onPress={handleAccept}
        disabled={justAccepted}
        className="flex-[2]"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <LinearGradient
          // Three stops, not two — a flat lime→limeDeep sweep reads as a
          // solid tint from a distance; adding a brighter highlight near
          // the top-left and letting it deepen past limeDeep on the way
          // out is what gives it a lit, rounded surface instead of a flat
          // fill (the "why does this button look expensive" trick most
          // premium app CTAs use).
          colors={['#aee637bd', colors.lime, colors.limeDeep]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // LinearGradient isn't one of NativeWind's auto-patched
          // components (same gap as BlurView) — layout goes through
          // `style`, not `className`, or it's silently dropped. borderRadius
          // stays here (not on a clipping parent) so the shadow below —
          // also on this same view — isn't cut off by an ancestor's
          // overflow:hidden, a real RN footgun with rounded shadowed views.
          style={{
            borderRadius: 999,
            paddingVertical: 17,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: colors.limeDeep,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View className="h-6 w-6 items-center justify-center">
            <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.limeDeep} />
          </View>
          <Text className="text-lg font-medium text-black">{justAccepted ? 'Accepted' : 'Accept Order'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
