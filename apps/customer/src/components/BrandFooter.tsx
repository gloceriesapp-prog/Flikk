// Brand sign-off — one shared component now, not the three near-identical
// copies that had drifted across this app (Categories' own CategoriesFooter,
// Home/AllTabSections importing that same file, and ProfileScreen's own
// hand-copied smaller variant with the version number added). Same slot/
// convention as Instamart's own "instamart / Crafted with 💙 in Bengaluru,
// India" block (reference), reworked for Gloceries: a wordmark plus a tagline,
// and a small hyperlocal callout underneath rather than a fabricated
// "trending" claim — Gloceries serves one zone (Kaup, outer Udupi, CLAUDE.md),
// so leaning into that is more honest and more distinctive than inventing
// a trend that isn't real.
//
// Two variants, not two components — `large` (the full-bleed low-opacity
// wordmark) for the end of a long scrolling grid/feed (Categories, Home's
// "All" tab, Store), `compact` (smaller, includes the real app version
// from package.json) for a Settings-style screen that already ends on its
// own list of rows (Profile). Same underlying content either way — no
// screen hand-rolls its own copy of this anymore.

import { HeartIcon, Linkedin01Icon, NewTwitterIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

interface Props {
  variant?: 'large' | 'compact';
  // TODO: no real Gloceries LinkedIn/Twitter page exists yet — icons render as
  // disabled (no onPress) rather than linking to a fabricated URL. Wire up
  // + enable once real handles exist.
  showSocialLinks?: boolean;
}

function SocialLinksRow() {
  return (
    <View className="mt-4 flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-ink/5">
        <AppIcon icon={Linkedin01Icon} size={16} color={`${colors.ink}80`} />
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-ink/5">
        <AppIcon icon={NewTwitterIcon} size={16} color={`${colors.ink}80`} />
      </View>
    </View>
  );
}

export function BrandFooter({ variant = 'large', showSocialLinks = false }: Props) {
  if (variant === 'compact') {
    return (
      <View className="items-center gap-1.5 pb-4 pt-5">
        <View className="flex-row items-center gap-2">
          <Text className="text-[13px] font-semibold text-ink/35">Gloceries</Text>
          <Text className="text-[13px] font-semibold text-ink/35">v{APP_VERSION}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-medium text-ink/40">Made with</Text>
          <AppIcon icon={HeartIcon} size={11} color={colors.danger} fill={colors.danger} />
          <Text className="text-xs font-medium text-ink/40">in Udupi, KA</Text>
        </View>
      </View>
    );
  }

  return (
    // pb-44, not a screen's own pb-28 — this block sits at the very
    // bottom of the scroll, right where BottomNavBar's floating pill +
    // CartBar/FreeDeliveryBar stack overlaps content (BottomNavBar.tsx:
    // that overlay reaches roughly insets.bottom + 140px up from the
    // physical bottom edge). Whatever's above this footer never reaches
    // that far down, so only this block needs the extra clearance.
    <View className="mt-8 px-6 pb-44 pt-10">
      <Text className="text-5xl font-semibold tracking-tight text-ink/10">Gloceries</Text>
      {/* Real filled heart (AppIcon's `fill` prop — see that component's own
          note on why `color` alone never solid-fills a hugeicons stroke
          icon), not the ❤️ emoji — renders identically across platforms
          instead of whatever heart glyph each OS's emoji font ships. */}
      <View className="mt-2 flex-row items-center gap-1">
        <Text className="text-sm font-medium text-ink/50">Made with</Text>
        <AppIcon icon={HeartIcon} size={14} color={colors.danger} fill={colors.danger} />
        <Text className="text-sm font-medium text-ink/50">in Udupi (Tulunadu), India</Text>
      </View>
      {showSocialLinks && <SocialLinksRow />}
    </View>
  );
}
