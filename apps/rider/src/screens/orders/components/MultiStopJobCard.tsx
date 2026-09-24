// One card for an entire multi-store trip (backend's own trip_id) — N legs
// that would otherwise show as N separate OrderQueueCards, even though
// they're one real job: pick up from each store, drop everything at one
// customer. Rendered as a pickup→drop timeline (one node per store, then the
// shared customer node) so the "several pickups, one drop" shape reads at a
// glance. Tapping opens whichever leg still needs action first (earliest not
// yet delivered), same "take me to the next thing to do" a single card gives.

import { ArrowRight01Icon, Location01Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { RiderOrder } from '../../../data/mockOrders';

interface Props {
  legs: RiderOrder[];
  onPress: (nextLegId: string) => void;
}

export function MultiStopJobCard({ legs, onPress }: Props) {
  // One combined payout for the whole trip, not one per leg summed —
  // every leg carries the same trip-level payout (apps/rider/src/api/
  // orders.ts's own note), so legs[0]'s is the trip's real total.
  const totalPayout = legs[0]!.payout;
  const totalItems = legs.reduce((sum, leg) => sum + leg.itemCount, 0);
  // A leg still 'assigned' needs pickup before anything else — the first
  // one found is next up (no real routing/sequencing beyond store order,
  // same "founder-manual, no auto-routing" scope CLAUDE.md already sets).
  // Once every leg is picked_up/arrived_at_customer, any of them opens the
  // same shared "heading to customer" map (OrderDetailScreen's own
  // allLegsPickedUp guard).
  const nextLeg = legs.find((leg) => leg.status === 'assigned') ?? legs[0]!;
  const pickedUpCount = legs.filter((leg) => leg.status !== 'assigned').length;
  const allPickedUp = pickedUpCount === legs.length;

  return (
    <Pressable
      onPress={() => onPress(nextLeg.id)}
      className="flex-row overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ width: 4, backgroundColor: colors.limeDeep }} />

      <View className="flex-1 gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-ink">{legs.length}-stop trip</Text>
          <View
            style={{ backgroundColor: allPickedUp ? 'rgba(46,158,119,0.14)' : 'rgba(124,181,24,0.14)' }}
            className="rounded-full px-2.5 py-1"
          >
            <Text
              style={{ color: allPickedUp ? colors.success : colors.limeDeep }}
              className="text-[11px] font-bold"
            >
              {pickedUpCount}/{legs.length} picked up
            </Text>
          </View>
        </View>

        {/* One node per store pickup (dim once that leg is picked up), then
            the shared customer drop node. */}
        <View>
          {legs.map((leg) => {
            const done = leg.status !== 'assigned';
            return (
              <View key={leg.id}>
                <View className="flex-row items-center gap-2.5">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: done ? `${colors.ink}25` : colors.gold }} />
                  <AppIcon icon={Store01Icon} size={13} color={`${colors.ink}80`} />
                  <Text className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{leg.storeName}</Text>
                </View>
                <View className="my-0.5 ml-[3px] h-3.5 w-px bg-ink/15" />
              </View>
            );
          })}
          <View className="flex-row items-center gap-2.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
            <AppIcon icon={Location01Icon} size={13} color={`${colors.ink}80`} />
            <Text className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{legs[0]!.customerName}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between border-t border-ink/[0.06] pt-3">
          <View className="flex-row items-center gap-1.5">
            <AppIcon icon={PackageIcon} size={13} color={`${colors.ink}70`} />
            <Text className="text-[12.5px] font-semibold text-ink/60">{totalItems} items total</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-[16px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>₹{totalPayout}</Text>
            <AppIcon icon={ArrowRight01Icon} size={15} color={colors.ink} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
