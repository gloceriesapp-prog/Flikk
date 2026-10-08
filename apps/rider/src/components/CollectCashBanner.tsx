// "Collect ₹X cash" — shown wherever a rider handles a cash-on-delivery
// order (assignment cards, order detail, drop navigation, PIN entry). The
// amount is the backend's cash_to_collect: the order total, or the whole trip
// total on a multi-shop trip. Prepaid orders render nothing.

import { Text, View } from 'react-native';
import { Money03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';

interface Props {
  paymentMethod?: 'cod' | 'online';
  cashToCollect?: number;
  compact?: boolean;
}

export function formatCash(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function CollectCashBanner({ paymentMethod, cashToCollect, compact = false }: Props) {
  if (paymentMethod !== 'cod' || !cashToCollect || cashToCollect <= 0) return null;
  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-center gap-2.5 rounded-xl bg-surge-soft ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
    >
      <AppIcon icon={Money03Icon} size={compact ? 16 : 20} color={colors.surge} />
      <View className="flex-1">
        <Text className={`font-extrabold text-ink ${compact ? 'text-[13px]' : 'text-[16px]'}`}>
          Collect ₹{formatCash(cashToCollect)} cash
        </Text>
        {!compact && <Text className="text-[12px] font-medium text-ink/60">Cash on delivery — take this from the customer before handing over.</Text>}
      </View>
    </View>
  );
}
