// "Delivery Details" card — first card in Cart's scroll list, same white
// rounded-2xl recipe as DeliveryTipCard/DeliverySchedulingCard below it
// (not a thin header bar anymore) so it reads as one of the cart's stack
// of cards instead of chrome bolted under the nav bar. Title + "Change" on
// one row, ETA pill below, address below that — deliberately in that
// order (title -> when -> where) rather than one cramped line, since
// that's the actual reading priority: a customer glancing at this wants
// "is this still going to the right place, roughly when" before the exact
// street.
//
// Only renders once a real saved address exists; the zero-address state
// is already handled by CartCheckoutFooter's own "Add delivery address"
// CTA, no reason to duplicate that here.
//
// ETA is a static realistic estimate ("20-25 min"), not computed from real
// coordinates — CartItem (useCartStore.ts) only carries storeId, no store
// lat/lng, so a real distance-based figure would need an extra store
// lookup nothing here currently makes. Same "status-only" scope CLAUDE.md
// already draws for the customer app — this is an estimate badge, not
// live tracking.

import { ChevronRightIcon, Location01Icon, ZapIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';
const ETA_LABEL = '20-25 min';

interface Props {
  address: ApiAddress;
  onPress: () => void;
}

export function CartDeliveryInfoBar({ address, onPress }: Props) {
  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-9 w-9 items-center justify-center">
            <AppIcon icon={Location01Icon} size={18}  />
          </View>
          <Text className="text-[15px] font-medium text-ink">Delivery Details</Text>
        </View>
        <Pressable onPress={onPress} hitSlop={8} className="flex-row items-center gap-0.5">
          <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
            Change
          </Text>
          <AppIcon icon={ChevronRightIcon} size={14} color={ACCENT} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2.5">
        <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: `${ACCENT}14` }}>
          <AppIcon icon={ZapIcon} size={12} color={ACCENT} />
          <Text className="text-[12px] font-bold" style={{ color: ACCENT }}>
            {ETA_LABEL}
          </Text>
        </View>

        <Text numberOfLines={1} className="flex-1 text-[13px] text-ink/60">
          <Text className="font-semibold text-ink">{address.label}</Text> · {address.line1}
        </Text>
      </View>
    </View>
  );
}
