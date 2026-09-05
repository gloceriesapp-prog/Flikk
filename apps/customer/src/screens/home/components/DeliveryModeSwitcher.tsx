// Right side of the header row, next to LocationSelector — one pill
// (GlassView, real iOS 26 Liquid Glass via expo-glass-effect, falls back
// to a plain translucent View on Android/web since the library's own
// fallback is an unstyled View) holding three shortcuts: Liked products
// (selected, solid-ink sub-box), Orders, Profile — replaces the earlier
// delivery-mode icon set and the separate always-visible ProfileAvatarButton
// circle (profile now lives inside this pill instead).
//
// Heart navigates to WishlistScreen (screens/wishlist/), clipboard
// navigates to ShoppingListScreen (screens/shopping-list/) — truck stays
// UI-only (no destination screen yet). The person icon navigates to
// ProfileScreen (screens/profile/), a real account + settings screen.
//
// colorScheme="dark" + white icons (not ink) — HomeHeader's background is
// one of categoryHeaderGradients.ts's own dark gradients (deep charcoal/
// aubergine for 'all', etc.), not a light pastel fill — an earlier version
// of this comment claimed otherwise and the icon colors were picked to
// match that stale claim, which is why clipboard/person were reading as
// near-invisible dark-on-dark (real bug, not a design choice — ink at any
// opacity disappears against a dark glass pill). White at reduced opacity
// is the correct muted-but-visible treatment against a dark backdrop, same
// convention BottomNavBar.tsx already uses for its own glass pill icons.
// The Android/web fallback (GlassView renders a plain View there) got a
// dark translucent background + a soft light border to match.

import { ClipboardListIcon, HeartIcon, UserIcon } from '@hugeicons/core-free-icons';
import { GlassView } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 999,
    padding: 6,
    // The native blur layer under GlassView renders past its own
    // borderRadius unless explicitly clipped — without this it shows as
    // a rectangular tinted halo around the rounded pill instead of a
    // clean rounded edge.
    overflow: 'hidden',
  },
});

export function DeliveryModeSwitcher() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    // GlassView is a native module like LinearGradient elsewhere in this
    // header (see HomeHeader.tsx's own note) — className is silently
    // ignored on it, layout has to go through style instead.
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      colorScheme="dark"
      style={[
        styles.pill,
        Platform.OS !== 'ios' && { backgroundColor: 'rgba(20,20,20,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
      ]}
    >
      {/* Heart stays on a solid white sub-box (the "selected/primary"
          treatment) regardless of light/dark pill — ink reads fine on
          white either way, this one was never the contrast bug. */}
      <Pressable
        className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10"
        onPress={() => navigation.navigate('Wishlist')}
      >
        <AppIcon icon={HeartIcon} size={18} color={colors.ink} strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="px-0.5" onPress={() => navigation.navigate('ShoppingList')}>
        <AppIcon icon={ClipboardListIcon} size={19} color="#FFFFFFCC" strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="pr-1" onPress={() => navigation.navigate('Profile')}>
        <AppIcon icon={UserIcon} size={19} color="#FFFFFFCC" strokeWidth={1.8} />
      </Pressable>
    </GlassView>
  );
}
