import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { IconlyClose } from '../../../components/icons/IconlyClose';
import { IconlyDiscountTag } from '../../../components/icons/IconlyDiscountTag';
import { useCartStore, type AppliedPromo } from '../../../store/useCartStore';

interface Props {
  appliedPromo: AppliedPromo | null;
  quotedDiscount?: number;
  onOpen: () => void;
}

export function PromoCodeCard({ appliedPromo, quotedDiscount, onOpen }: Props) {
  const setAppliedPromo = useCartStore((state) => state.setAppliedPromo);
  return (
    <View className="rounded-2xl bg-white shadow-sm shadow-black/5">
      <Pressable accessibilityRole="button" accessibilityLabel="View all coupons and offers" onPress={onOpen}
        className="min-h-[60px] flex-row items-center gap-3 px-5 py-4">
        <IconlyDiscountTag size={24} color="#85878B" />
        <Text className="min-w-0 flex-1 text-[16px] font-semibold text-ink">Coupons &amp; Offers</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[14px] font-semibold text-[#00864A]">View All</Text>
          <AppIcon icon={ArrowRight01Icon} size={18} color="#00864A" />
        </View>
      </Pressable>
      {appliedPromo && (
        <View className="mx-5 flex-row items-center gap-3 border-t border-[#F0F1F3] py-2">
          <Text className="flex-1 text-[13px] leading-5 font-medium text-[#00864A]">
            {appliedPromo.code} applied · ₹{(quotedDiscount ?? appliedPromo.discountAmount).toFixed(2)} saved
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove promo code" onPress={() => setAppliedPromo(null)}
            className="h-11 w-11 items-center justify-center">
            <IconlyClose size={18} color="#737579" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
