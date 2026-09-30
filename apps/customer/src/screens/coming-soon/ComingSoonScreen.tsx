// Generic "not built yet" screen — a real destination for the "UI exists,
// flow not wired" tap targets already scattered across this app (e.g.
// Profile's Payment Methods/Notifications/Help & Support/Account Privacy/
// About Gloceries rows). Those used to be no-op Pressables with nothing behind
// them at all — tapping did nothing, no feedback, no sign the app even
// registered the tap. This gives every one of them somewhere real to go
// instead, with an honest "still building this" message rather than a
// silent dead end.
//
// Reuses the SAME visual language as home/unavailable-zone/
// UnavailableZoneSection.tsx — that reddish panel + left-aligned bold
// title + subtitle is this app's own already-designed "nothing here yet"
// treatment, per an explicit ask to use that instead of inventing a
// second one (the earlier rocket-icon version this replaced). Same
// PANEL_BG, same copy shape, just filling a whole screen instead of
// sitting inline inside Home's "All" tab.
//
// title/subtitle are route params, not hardcoded — the same screen serves
// "Payment Methods" and "Help & Support" and whatever else, each with its
// own real copy, rather than a new screen per feature that isn't live yet.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ComingSoon'>;

// Same reddish panel color UnavailableZoneSection.tsx uses for its own
// "we're on our way" treatment — kept as the identical hex, not a
// re-derived approximation, so the two can never visibly drift apart.
const PANEL_BG = '#F7DEDC';

export function ComingSoonScreen({ navigation, route }: Props) {
  const { title, subtitle } = route.params ?? {};

  return (
    <View className="flex-1" style={{ backgroundColor: PANEL_BG }}>
      <View className="flex-row items-center px-2 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        {title ? (
          <Text className="flex-1 text-center text-[17px] font-semibold text-ink" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        <View className="h-11 w-11" />
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full items-start gap-2">
          <Text className="text-left text-[22px] font-semibold text-ink">We&apos;re On Our Way.</Text>
          <Text className="text-left text-[15px] leading-6 text-ink/55">
            {subtitle ?? `${title ?? 'This'} isn't live in the app just yet — we're still building it out.`}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-8 w-full items-center rounded-2xl py-3.5"
          style={{ backgroundColor: colors.ink }}
        >
          <Text className="text-[15px] font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    </View>
  );
}
