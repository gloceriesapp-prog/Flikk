// Right side of the header row, next to LocationSelector — one pill
// (GlassView, real iOS 26 Liquid Glass via expo-glass-effect, falls back
// to a plain translucent View on Android/web since the library's own
// fallback is an unstyled View) holding three shortcuts: Liked products
// (selected, solid-ink sub-box), Orders, Profile — replaces the earlier
// delivery-mode icon set and the separate always-visible ProfileAvatarButton
// circle (profile now lives inside this pill instead).
//
// UI-only per the request — no navigation wired up, this mirrors
// CategoryTabs' own selected/unselected visual pattern rather than
// introducing a new one.
//
// colorScheme="dark" + white icons — HomeHeader's background is a dark
// radial gradient, so the glass and its plain (unselected) icons both
// need the dark-mode treatment to stay legible. The Android/web fallback
// (GlassView renders a plain View there) got its own translucent-dark
// background for the same reason.

import { HeartIcon, TruckIcon, UserIcon } from '@hugeicons/core-free-icons';
import { GlassView } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

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
        Platform.OS !== 'ios' && { backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
      ]}
    >
      <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <AppIcon icon={HeartIcon} size={18} color="#101C10" strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="px-0.5">
        <AppIcon icon={TruckIcon} size={19} color="#FFFFFF" strokeWidth={1.8} />
      </Pressable>

      <Pressable hitSlop={6} className="pr-1">
        <AppIcon icon={UserIcon} size={19} color="#FFFFFF" strokeWidth={1.8} />
      </Pressable>
    </GlassView>
  );
}
