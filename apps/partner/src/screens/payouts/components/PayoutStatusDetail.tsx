// Per-payout extra line under the status pill: the UTR (with copy) for a
// paid week so the owner can match it in their bank statement, or a clear
// problem message + "Update payout details" CTA for blocked/failed.
// Renders nothing for scheduled weeks or sample rows.

import { Clipboard, Pressable, Text, View } from 'react-native';
import { Copy01Icon } from '@hugeicons/core-free-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import { payoutStatusPresentation, type WeeklyPayout } from '../data';

export function PayoutStatusDetail({ payout, variant = 'light' }: { payout: WeeklyPayout; variant?: 'light' | 'dark' }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { problem } = payoutStatusPresentation(payout);
  const isDark = variant === 'dark';
  if (payout.isSample) return null;

  if (payout.status === 'paid' && payout.utr) {
    const utr = payout.utr;
    return (
      <View className="gap-2">
        {payout.paymentNote && <Text className={`text-[12px] font-medium ${isDark ? 'text-white/70' : 'text-ink/70'}`}>Admin note: {payout.paymentNote}</Text>}
        <View className="flex-row items-center gap-2">
        <Text className={`flex-1 text-[12px] font-medium ${isDark ? 'text-white/60' : 'text-ink/50'}`} selectable>
          UTR {utr}
        </Text>
        {/* RN core Clipboard (deprecated but still shipped) — avoids adding expo-clipboard + a native rebuild for one button. */}
        <Pressable onPress={() => Clipboard.setString(utr)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Copy UTR ${utr}`}>
          <AppIcon icon={Copy01Icon} size={15} color={isDark ? '#FFFFFF' : colors.ink} />
        </Pressable>
        </View>
      </View>
    );
  }

  if (!problem) return null;
  return (
    <View className="gap-2">
      <Text className={`text-[12.5px] font-medium ${isDark ? 'text-white/70' : 'text-danger'}`}>{problem}</Text>
      <Pressable
        onPress={() => navigation.navigate('StoreSettings')}
        accessibilityRole="button"
        className="items-center rounded-xl py-2.5"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-[13px] font-semibold text-white">Update payout details</Text>
      </Pressable>
    </View>
  );
}
