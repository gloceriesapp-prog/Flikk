// Just the week-navigation row — coral left arrow (always active), gray
// right arrow (disabled at offset 0, since no future earnings exist to
// page into). The big balance + label used to live in this same
// component; the summary figure is now EarningsSummaryCard.tsx (its
// Today/Week toggle) — this file owns only navigation.

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  weekLabel: string;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function EarningsWeekHeader({ weekLabel, canGoNext, onPrev, onNext }: Props) {
  const insets = useSafeAreaInsets();

  // Text sits in a flex-1 middle column between two identically-sized
  // (h-9 w-9) buttons, not a gap-based row centered as one block — with a
  // solid-orange left button and a near-invisible light-gray right one,
  // centering "the group" reads as off-center to the eye even when it's
  // mathematically centered (the two ends have very different visual
  // weight). Pinning the date to its own flex-1, text-centered column
  // between two same-size end-caps is what actually guarantees the label
  // sits in the true center of the screen, on both platforms, regardless
  // of how long the label text is.
  // alignItems/justifyContent/padding set inline, not just via className —
  // Android's Pressable carries its own default padding that can nudge an
  // icon a couple px off-center inside a fixed-size circle even when the
  // className says centered; iOS usually doesn't show it, so relying on
  // className alone looks fine in one platform and off in the other.
  const circleStyle = { alignItems: 'center' as const, justifyContent: 'center' as const, padding: 0 };

  return (
    <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center bg-[#F8F8F8] px-5 pb-5">
      {/* <Pressable onPress={onPrev} hitSlop={8} style={circleStyle} className="h-9 w-9 rounded-full bg-gray-200">
        <AppIcon icon={ArrowLeft01Icon} size={16} color={canGoNext ? colors.ink : `${colors.ink}40`} />
      </Pressable> */}
      <Text className="flex-1 text-center text-[17px] font-semibold text-ink">{weekLabel}</Text>
      {/* <Pressable
        onPress={onNext}
        disabled={!canGoNext}
        hitSlop={8}
        style={circleStyle}
        className={`h-9 w-9 rounded-full ${canGoNext ? 'bg-mist' : 'bg-gray-200'}`}
      >
        <AppIcon icon={ArrowRight01Icon} size={16} color={canGoNext ? colors.ink : `${colors.ink}40`} />
      </Pressable> */}
    </View>
  );
}
