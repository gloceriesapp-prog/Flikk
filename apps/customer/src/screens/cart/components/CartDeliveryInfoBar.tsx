import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
// "Delivery Details" card — first card in Cart's scroll list, same white
// rounded-2xl recipe as the other cards below it (BillDetailsCard etc.)
// so it reads as one of the cart's stack of cards instead of chrome
// bolted under the nav bar.
//
// Redesigned tighter/single-row per an explicit ask ("reduce the size...
// make a proper alignment") — a pin-in-a-circle icon doubles as the
// title's own leading glyph (one element carrying two jobs: "this is the
// address section" + a visual anchor) instead of a bare text label, and
// the ETA pill sits inline with the address on one line instead of its
// own separate row above it. Still the same info (address + ETA + Change),
// just read left-to-right in one glance rather than stacked in three.
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

interface Props {
  address: ApiAddress;
  onPress: () => void;
}

export function CartDeliveryInfoBar({ address, onPress }: Props) {
  const estimatedMinutes = useDeliveryEstimateMinutes();
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}14` }}>
        <AppIcon icon={Location01Icon} size={17} color={ACCENT} />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-[15px] font-semibold text-ink">
           {address.label}
          </Text>
          <View className="flex-row items-center gap-0.5 rounded-full px-1.5 py-[1px]" style={{ backgroundColor: `${ACCENT}14` }}>
            <AppIcon icon={ZapIcon} size={9} color={ACCENT} />
            <Text className="text-[12.5px] font-semibold" style={{ color: ACCENT }}>
              {`${estimatedMinutes} min`}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} className="text-[12.5px] text-ink/50 font-medium">
          {address.line1}
        </Text>
      </View>

      <View className="flex-row items-center gap-0.5">
        <Text className="text-[12.5px] font-semibold" style={{ color: ACCENT }}>
          Change
        </Text>
        <AppIcon icon={ChevronRightIcon} size={13} color={ACCENT} />
      </View>
    </Pressable>
  );
}
