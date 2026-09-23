// Offline home — what a rider sees whenever they're off-shift
// (isOnline === false). Rendered in place of the live dashboard by
// HomeScreen so it shows automatically the moment they go (or start)
// offline. Mirrors image #26's layout — greeting + avatar, today's
// earnings, a deliveries/active-time split, shift, daily goal, one big
// GO ONLINE button, a Support/Settings footer — in the app's LIGHT theme:
// gray page (#F1F2F4, same as customer checkout) + white cards.
//
// Real numbers where they exist: today's earnings and delivery count come
// from the same completedOrders history the live dashboard filters on.
// Features with no backend yet (shift scheduling, per-rider goal, settings)
// stay honest — an info alert or a local target, never a fabricated value.

import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon, Target01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { useActiveMsToday } from '../../hooks/useActiveMsToday';
import { formatDurationShort, isToday, todayLabel } from '../../utils/date';
import { RiderHomeHeader } from './components/RiderHomeHeader';
import { OnlineStatusBadge } from './components/OnlineStatusBadge';
import type { AppStackParamList, AppTabParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

const PAGE_BG = '#F1F2F4'; // gray page, same as the live dashboard
const CARD_BORDER = '#EAECEE';
const TRACK_BG = '#EEF0F1'; // progress-bar track

// ponytail: local target only — no per-rider goal backend. One constant;
// swap for a riders.daily_goal column when goals become configurable.
const DAILY_GOAL = 1000;

export function OfflineHomeScreen() {
  const navigation = useNavigation<Nav>();
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);

  const todayOrders = completedOrders.filter((o) => o.deliveredAt && isToday(o.deliveredAt));
  const todayEarnings = todayOrders.reduce((sum, o) => sum + o.payout, 0);
  // Frozen daily total — the time banked from earlier shifts today, held
  // steady while offline (0 only if they haven't been online at all today),
  // resets at midnight. Same reading the live dashboard shows, just not
  // ticking.
  const activeMs = useActiveMsToday();

  const goalPct = Math.min(100, Math.round((todayEarnings / DAILY_GOAL) * 100));

  function comingSoon(feature: string) {
    Alert.alert(feature, `${feature} isn't available yet — it's coming in a future update.`);
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: PAGE_BG }}
      contentContainerClassName="gap-4 px-5 pb-12 pt-safe-offset-4"
      showsVerticalScrollIndicator={false}
    >
      {/* Shared header (avatar + greeting + online pill + gear→Profile) —
          identical on the live dashboard, only the pill state differs. */}
      <RiderHomeHeader isOnline={false} />

      {/* Today's earnings hero + deliveries/active-time split — white card,
          real numbers. Tap the earnings row → Earnings tab. */}
      <View className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: CARD_BORDER }}>
        <Pressable
          onPress={() => navigation.navigate('Earnings')}
          className="flex-row items-stretch justify-between px-5 pb-4 pt-5"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View>
            <Text className="text-[15px] font-semibold text-[#000000]">Today's Earnings ({todayLabel()})</Text>
            <Text className="mt-1.5 text-[38px] font-bold tabular-nums">
              ₹{todayEarnings}
            </Text>
          </View>
          {/* Right end — live online/offline status on top, tap-through
              chevron below (card still opens the Earnings tab). */}
          <View className="items-end justify-between">
            <OnlineStatusBadge />
            <AppIcon icon={ArrowRight01Icon} size={24} color={colors.ink} />
          </View>
        </Pressable>

        <View className="flex-row border-t" style={{ borderColor: CARD_BORDER }}>
          <View className="flex-1 border-r px-5 py-4" style={{ borderColor: CARD_BORDER }}>
            <Text className="text-[22px] font-bold text-ink tabular-nums">{todayOrders.length}</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-ink/50">Delivered</Text>
          </View>
          <View className="flex-1 px-5 py-4">
            <Text className="text-[22px] font-bold text-ink tabular-nums">{formatDurationShort(activeMs)}</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-ink/50">Active time</Text>
          </View>
        </View>
      </View>

      {/* Shift — no scheduling backend yet, so honest "Not scheduled" + a
          Set action that says so, never a fabricated time window. */}
      <View className="flex-row items-center justify-between rounded-2xl border bg-white px-5 py-4" style={{ borderColor: CARD_BORDER }}>
        <View className="flex-row items-center gap-3.5">
          <View>
            <Text className="text-[15px] font-semibold text-ink">Shift</Text>
            <Text className="mt-0.5 text-[13px] font-medium text-ink/50">Not scheduled</Text>
          </View>
        </View>
        <Pressable onPress={() => comingSoon('Shift scheduling')} hitSlop={8}>
          <Text className="text-[15px] font-semibold underline" style={{ color: colors.limeDeep }}>Set</Text>
        </Pressable>
      </View>

      {/* Daily goal — real earnings against a local target (see DAILY_GOAL). */}
      <View className="rounded-2xl border bg-white px-5 py-4" style={{ borderColor: CARD_BORDER }}>
        <View className="flex-row items-center gap-2">
          <AppIcon icon={Target01Icon} size={18} color={colors.ink} />
          <Text className="text-[15px] font-bold text-ink">Daily Goal</Text>
        </View>
        <View className="mt-3.5 h-3 overflow-hidden rounded-full" style={{ backgroundColor: TRACK_BG }}>
          <View className="h-full rounded-full" style={{ width: `${goalPct}%`, backgroundColor: colors.lime }} />
        </View>
        <Text className="mt-2.5 text-right text-[14px] font-semibold text-ink/55" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{todayEarnings} / ₹{DAILY_GOAL}
        </Text>
      </View>

      {/* Go-online lives in the header pill now — this is just a nudge. */}
      <Text className="mt-1 text-center text-[14px] font-medium text-ink/45">
        You're offline. Tap Go online to start receiving orders.
      </Text>

    </ScrollView>
  );
}
