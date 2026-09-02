// Right side of the header row, next to LocationSelector — one pill
// (GlassView, real iOS 26 Liquid Glass via expo-glass-effect, falls back
// to a plain translucent View on Android/web since the library's own
// fallback is an unstyled View) holding three shortcuts: Liked products
// (selected, solid-ink sub-box), Orders, Profile — replaces the earlier
// delivery-mode icon set and the separate always-visible ProfileAvatarButton
// circle (profile now lives inside this pill instead).
//
// Heart/truck stay UI-only (no destination screen yet) — the person icon
// now navigates to ProfileScreen (screens/profile/), a real account +
// settings screen, not a stub.
//
// colorScheme="light" + ink icons — HomeHeader's background is a light
// pastel fill (#E8E7FF), not the earlier dark gradient, so the glass and
// its plain (unselected) icons both need the light-mode treatment to stay
// legible. The Android/web fallback (GlassView renders a plain View there)
// got its own translucent-white background + a soft border for the same
// reason, rather than the dark tint it used to need.

import { ClipboardListIcon, HeartIcon, TruckIcon, UserIcon } from '@hugeicons/core-free-icons';
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
      colorScheme="light"
      style={[
        styles.pill,
        Platform.OS !== 'ios' && { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(16,28,16,0.1)' },
      ]}
    >
      <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10">
        <AppIcon icon={HeartIcon} size={18} color={colors.ink} strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="px-0.5">
        <AppIcon icon={ClipboardListIcon} size={19} color={colors.mist} strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="pr-1" onPress={() => navigation.navigate('Profile')}>
        <AppIcon icon={UserIcon} size={19} color={colors.mist} strokeWidth={1.8} />
      </Pressable>
    </GlassView>
  );
}
