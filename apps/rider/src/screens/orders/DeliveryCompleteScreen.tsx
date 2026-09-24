// Delivery-complete celebration — the terminal step of the drop flow, reached
// via navigation.replace from DeliveryProof once the OTP handover wrote
// `delivered` for every trip leg. Mirrors the onboarding PayoutSuccessScreen's
// pattern: the same muted tick mp4 (expo-video) plays, then the earnings
// receipt for the just-finished delivery sits below it.
//
// Light theme (white bg, gray #F1F1F4 cards) — the design mockup is dark, but
// the rider app's delivery flow is light throughout (PickupNavigation /
// DeliveryNavigation / DeliveryProof), so this matches its own siblings, not
// the dark comp.
//
// Earnings are REAL order fields (mockOrders' generators): payout = baseFare +
// distanceFare + surge. "Incentive" = surge (shown only when > 0). Distance =
// distanceKm; Time = etaMinutes(distanceKm) (straight-line ETA, same caveat as
// everywhere else). For a multi-store trip the figures sum across every leg —
// one combined payout per trip, same rule the store's payout logic uses.
// "Today's total" sums every delivery completed today from the persisted
// history.

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock01Icon, Route02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { etaMinutes } from '../../utils/geo';
import { isToday } from '../../utils/date';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryComplete'>;

const TICK_VIDEO =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/Success%20Tick.mp4';

const rupee = (n: number) => `₹${Math.round(n)}`;

export function DeliveryCompleteScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);

  // The just-delivered order now lives in completedOrders (the store moved it
  // there on the delivered write); fall back to activeOrders only for a stale
  // deep-link. Sum every leg of the same trip — one receipt per trip.
  const order = completedOrders.find((o) => o.id === orderId) ?? activeOrders.find((o) => o.id === orderId);
  const tripLegs = order?.tripId
    ? completedOrders.filter((o) => o.tripId === order.tripId)
    : order
      ? [order]
      : [];

  const player = useVideoPlayer(TICK_VIDEO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  // Guard an impossible-but-typed empty tripLegs so the sums below never read
  // undefined. A gone order just shows zeros behind the tick + a way home.
  const sum = (pick: (o: (typeof tripLegs)[number]) => number) => tripLegs.reduce((t, o) => t + pick(o), 0);
  const earning = sum((o) => o.payout + (o.tip ?? 0));
  const basePay = sum((o) => o.baseFare);
  const distancePay = sum((o) => o.distanceFare);
  const incentive = sum((o) => o.surge);
  const distance = sum((o) => o.distanceKm);
  const time = etaMinutes(distance);

  // Every delivery banked today (this one included — it's in completedOrders).
  const todaysTotal = completedOrders
    .filter((o) => o.deliveredAt && isToday(o.deliveredAt))
    .reduce((t, o) => t + o.payout + (o.tip ?? 0), 0);

  useEffect(() => {
    return () => player.release();
  }, [player]);

  useEffect(() => () => player.release(), [player]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-1 justify-center gap-6 px-5">
        {/* Tick + headline — same muted mp4 the onboarding success uses. */}
        <View className="items-center gap-2">
          <VideoView player={player} style={{ height: 108, width: 108 }} contentFit="contain" nativeControls={false} />
          <Text className="text-[24px] font-bold text-ink">Delivery completed</Text>
        </View>

        {/* Earning receipt — gray card. Headline payout + itemized breakup +
            distance/time footer, exactly the "why is my payout this number"
            transparency the mock spells out. */}
        <View className="gap-4 rounded-3xl bg-[#F1F1F4] p-5">
          <View>
            <Text className="text-[13px] font-semibold text-ink/50">Earning</Text>
            <Text className="text-[34px] font-bold text-ink tabular-nums">{rupee(earning)}</Text>
          </View>

          <View className="gap-2">
            <Row label="Base pay" value={rupee(basePay)} />
            <Row label="Distance pay" value={rupee(distancePay)} />
            {incentive > 0 ? <Row label="Incentive" value={`+${rupee(incentive)}`} accent /> : null}
          </View>

          <View className="flex-row gap-3 border-t border-ink/10 pt-4">
            <Stat icon={Route02Icon} value={`${distance.toFixed(1)} km`} label="Distance" />
            <Stat icon={Clock01Icon} value={`${time} min`} label="Time" />
          </View>
        </View>

        {/* Today's running total — second gray card, quieter. */}
        <View className="rounded-3xl bg-[#F1F1F4] p-5">
          <Text className="text-[13px] font-semibold text-ink/50">Today&rsquo;s total</Text>
          <Text className="text-[24px] font-bold text-ink tabular-nums">{rupee(todaysTotal)}</Text>
        </View>
      </View>

      <View className="px-5">
        <PrimaryButton label="Get next order" onPress={() => navigation.navigate('Tabs')} />
      </View>
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[14px] text-ink/60">{label}</Text>
      <Text className={`text-[14px] font-semibold tabular-nums ${accent ? 'text-success' : 'text-ink'}`}>{value}</Text>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: Parameters<typeof AppIcon>[0]['icon']; value: string; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <AppIcon icon={icon} size={18} color={colors.ink} />
      </View>
      <View>
        <Text className="text-[15px] font-bold text-ink tabular-nums">{value}</Text>
        <Text className="text-[12px] text-ink/45">{label}</Text>
      </View>
    </View>
  );
}
