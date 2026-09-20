// "N orders in this settlement · View all" — replaces the old inline
// expand-in-place order list. That list only grows (18-24+ rows per week),
// and a card that has to grow to fit it stops being a card — so this is
// just the entry point now; the real list lives on PayoutOrderHistoryScreen.
// Reads navigation directly via useNavigation rather than threading a
// callback down from PayoutsScreen through two component layers — this
// component only ever does one thing with it.

import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import type { WeeklyPayout } from '../data';

interface Props {
  payout: WeeklyPayout;
  variant?: 'light' | 'dark';
}

export function PayoutOrdersLink({ payout, variant = 'light' }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isDark = variant === 'dark';

  return (
    <Pressable
      onPress={() =>
        navigation.navigate('PayoutOrderHistory', {
          payoutId: payout.id,
          weekLabel: payout.weekLabel,
          isSample: payout.isSample,
          sampleTotals: payout.isSample
            ? { orderCount: payout.orderCount, grossAmount: payout.grossAmount, commissionAmount: payout.commissionAmount }
            : undefined,
        })
      }
      className={`flex-row items-center justify-between ${isDark ? 'border-t border-white/10 pt-4' : 'border-t border-black/5 pt-3'}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text className={`text-[13.5px] font-medium ${isDark ? 'text-white/60' : 'text-ink/60'}`}>
        View all {payout.orderCount} {payout.orderCount === 1 ? 'order' : 'orders'}
      </Text>
      <View className="flex-row items-center gap-1">
        <Text className={`text-[13.5px] font-semibold ${isDark ? 'text-white' : 'text-ink'}`}>View all</Text>
        <AppIcon icon={ArrowRight01Icon} size={13} color={isDark ? '#FFFFFF' : colors.ink} />
      </View>
    </Pressable>
  );
}
