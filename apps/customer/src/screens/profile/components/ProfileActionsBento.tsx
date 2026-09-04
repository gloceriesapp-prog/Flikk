// Bento — one wide "My Orders" tile, then three SEPARATE bordered cards
// (Wishlist / Support / My Refunds) side by side — matches the Blinkit
// reference's own individually-bordered-tile look per an explicit ask,
// not one shared card with three columns inside it. My Orders gets the
// same bordered-white-card treatment (border, not a solid gray fill) so
// it reads as the same family as the three tiles below it, just wider.
// Gray throughout — no lime/green accent, this screen doesn't carry the
// brand color, unlike Home. Address Book and Payment Methods live in
// ProfileScreen's own Preferences list instead. Track Order dropped
// entirely — same destination as My Orders (Purchase), a redundant
// second tile pointing at the same place.

import type { IconSvgElement } from '@hugeicons/react-native';
import { ArrowRight02Icon, CustomerService01Icon, DeliveryReturn02Icon, HeartIcon, PackageIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onMyOrders: () => void;
  onWishlist: () => void;
  onSupport: () => void;
  onRefunds: () => void;
}

function BorderedTile({ icon, label, onPress }: { icon: IconSvgElement; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-2 rounded-[24px] bg-white py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <AppIcon icon={icon} size={18} color={`${colors.ink}99`} strokeWidth={1.7} />
      </View>
      <Text className="text-[13px] font-medium text-ink">{label}</Text>
    </Pressable>
  );
}

export function ProfileActionsBento({ onMyOrders, onWishlist, onSupport, onRefunds }: Props) {
  return (
    <View className="gap-2">
      <Pressable
        onPress={onMyOrders}
        className="flex-row items-center gap-3 rounded-[24px] bg-white px-4 py-3.5"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100">
          <AppIcon icon={PackageIcon} size={20} color={`${colors.ink}99`} strokeWidth={1.7} />
        </View>
        <Text className="flex-1 text-[15px] font-medium text-ink">My Orders</Text>
        <AppIcon icon={ArrowRight02Icon} size={16} color={`${colors.ink}80`} />
      </Pressable>

      <View className="flex-row gap-2">
        <BorderedTile icon={HeartIcon} label="Wishlist" onPress={onWishlist} />
        <BorderedTile icon={CustomerService01Icon} label="Support" onPress={onSupport} />
        <BorderedTile icon={DeliveryReturn02Icon} label="My Refunds" onPress={onRefunds} />
      </View>
    </View>
  );
}
