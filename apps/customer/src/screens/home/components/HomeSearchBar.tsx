// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// This bar just looks like an input and shows the rolling search-term hint
// (RotatingSearchHint — same rotating-text mechanism kept, only the outer
// shell changed). One pill now, not a search box plus a separate icon box:
// magnifying glass + hint on the left, a wishlist icon on the right (was a
// filter icon — swapped per an explicit ask; that filter control had no
// onPress of its own either, so this isn't removing working filter
// behavior). Truck/mic shortcuts dropped — TrackOrder is still reachable
// from Purchase's LiveOrderCard, this bar just no longer duplicates that
// shortcut.
//
// Wishlist icon has no onPress yet — same "UI exists, flow not wired"
// convention as ProductCardView's own bookmark heart: this app has no
// wishlist screen to open yet (CartItemRow's own note on why there's no
// "move to wishlist" link either).

import { HeartIcon, Mic01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';

interface Props {
  onPress: () => void;
}

export function HomeSearchBar({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="mt-4 h-[52px] flex-row items-center rounded-full bg-gray-100 px-4">
      <View className="pr-2">
        <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      </View>
      <View className="flex-1">
        <RotatingSearchHint />
      </View>

      {/* This bar isn't a real input (see file header) so real voice
          capture can't happen here — tapping the mic does the same thing
          as tapping the rest of the bar (opens the real Search screen,
          SearchHeader.tsx's own mic button is the one that actually
          listens), rather than being a dead icon with no onPress at all. */}
      <Pressable onPress={onPress} hitSlop={8} className="pl-3">
        <AppIcon icon={Mic01Icon} size={19} color={colors.ink} strokeWidth={1.8} />
      </Pressable>
    </Pressable>
  );
}
