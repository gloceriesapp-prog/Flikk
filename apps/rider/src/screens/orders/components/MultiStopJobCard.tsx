// One card for an entire multi-store trip (backend's own trip_id) — N legs
// that would otherwise show as N separate OrderQueueCards, even though
// they're one real job: pick up from each store, drop everything at one
// customer. Tapping opens whichever leg still needs action first (the
// earliest one not yet delivered), same "take me to the next thing to do"
// idea a single OrderQueueCard tap already gives for one order.

import { ArrowRight01Icon, PackageIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

interface Props {
  legs: RiderOrder[];
  onPress: (nextLegId: string) => void;
}

export function MultiStopJobCard({ legs, onPress }: Props) {
  const totalPayout = legs.reduce((sum, leg) => sum + leg.payout, 0);
  const totalItems = legs.reduce((sum, leg) => sum + leg.itemCount, 0);
  // A leg still 'assigned' needs pickup before anything else — the first
  // one found is next up (no real routing/sequencing beyond store order,
  // same "founder-manual, no auto-routing" scope CLAUDE.md already sets).
  // Once every leg is picked_up/arrived_at_customer, any of them opens the
  // same shared "heading to customer" map (OrderDetailScreen's own
  // allLegsPickedUp guard).
  const nextLeg = legs.find((leg) => leg.status === 'assigned') ?? legs[0]!;
  const pickedUpCount = legs.filter((leg) => leg.status !== 'assigned').length;

  return (
    <Pressable onPress={() => onPress(nextLeg.id)} className="gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{legs.length}-stop trip</Text>
        <View className="rounded-full bg-lime-soft px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-lime-deep">
            {pickedUpCount}/{legs.length} picked up
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <AppIcon icon={PackageIcon} size={14} color={colors.ink} />
        <Text className="flex-1 text-[13px] text-ink/60 font-medium" numberOfLines={1}>
          {legs.map((leg) => leg.storeName).join(' + ')} → {legs[0]!.customerName}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-medium text-ink/70">{totalItems} items total</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] font-semibold text-ink">₹{totalPayout}</Text>
          <AppIcon icon={ArrowRight01Icon} size={15} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
