// Brand sign-off for the bottom of a Settings-style screen — same slot/
// role as apps/customer's own BrandFooter.tsx 'compact' variant, but the
// tagline here is written for a shop owner reading it, not a shopper: a
// store owner scrolling to the bottom of their own Settings screen is a
// different moment than a customer browsing a feed, and deserves its own
// real thank-you rather than the customer app's copy reused verbatim.
//
// Real filled heart (AppIcon's `fill` prop, same reasoning customer's own
// BrandFooter documents) — renders identically across platforms instead
// of whatever heart glyph each OS's emoji font ships.

import { HeartIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

export function BrandFooter() {
  return (
    <View className="items-center gap-1.5 pb-6 pt-5">
      <View className="flex-row items-center gap-2">
        <Text className="text-[13px] font-semibold text-ink/35">Gloceries Partner</Text>
        <Text className="text-[13px] font-semibold text-ink/35">v{APP_VERSION}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-xs font-medium text-ink/40">Built with</Text>
        <AppIcon icon={HeartIcon} size={11} color={colors.danger} fill={colors.danger} />
        <Text className="text-xs font-medium text-ink/40">in Udupi, for shops like yours</Text>
      </View>
    </View>
  );
}
