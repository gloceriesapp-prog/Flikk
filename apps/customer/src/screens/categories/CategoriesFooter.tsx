// Brand sign-off at the bottom of the full category grid — same slot/
// convention as Instamart's own "instamart / Crafted with 💙 in Bengaluru,
// India" block (reference), reworked for Flikk: a large, low-opacity
// wordmark (never a saturated brand color at this size — it'd fight the
// grid above it for attention) plus a tagline, and a small hyperlocal
// hashtag underneath rather than a fabricated "trending" claim — Flikk
// serves one zone (Kaup, outer Udupi, CLAUDE.md), so leaning into that is
// more honest and more distinctive than inventing a trend that isn't real.

import { HeartIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';

export function CategoriesFooter() {
  return (
    // pb-44, not the screen's own pb-28 — this block sits at the very
    // bottom of the scroll, right where BottomNavBar's floating pill +
    // CartBar/FreeDeliveryBar stack overlaps content (BottomNavBar.tsx:
    // that overlay reaches roughly insets.bottom + 140px up from the
    // physical bottom edge). The grid above never reaches that far down,
    // so only this footer needs the extra clearance.
    <View className="mt-8 px-6 pb-44 pt-10">
      <Text className="text-5xl font-extrabold tracking-tight text-ink/10">Flikk</Text>
      {/* Real filled heart (AppIcon's `fill` prop — see that component's own
          note on why `color` alone never solid-fills a hugeicons stroke
          icon), not the ❤️ emoji — renders identically across platforms
          instead of whatever heart glyph each OS's emoji font ships. */}
      <View className="mt-2 flex-row items-center gap-1 ">
        <Text className="text-sm font-medium text-ink/50">Made with</Text>
        <AppIcon icon={HeartIcon} size={14} color={colors.danger} fill={colors.danger} />
        <Text className="text-sm font-medium text-ink/50">in Udupi (Tulunadu), India</Text>
      </View>
    </View>
  );
}
