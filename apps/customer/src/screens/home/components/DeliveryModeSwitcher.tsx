// Right side of the header row, next to LocationSelector — one pill
// (GlassView, real iOS 26 Liquid Glass via expo-glass-effect, falls back
// to a plain translucent View on Android/web since the library's own
// fallback is an unstyled View) holding Wishlist on the left and Profile
// on the right. The search row stays free for a full-width search bar.
//
// The person icon navigates to ProfileScreen (screens/profile/), a real
// account + settings screen.
//
// colorScheme follows `light`: the header is a light pastel gradient now
// (categoryHeaderGradients.ts), so light glass + ink icon. The Android/web
// fallback (GlassView renders a plain View there) gets a matching
// translucent background + soft border.

import { HeartIcon, UserIcon } from '@hugeicons/core-free-icons';
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
    borderRadius: 999,
    padding: 2,
    flexShrink: 0,
    // The native blur layer under GlassView renders past its own
    // borderRadius unless explicitly clipped — without this it shows as
    // a rectangular tinted halo around the rounded pill instead of a
    // clean rounded edge.
    overflow: 'hidden',
  },
});

export function DeliveryModeSwitcher({ light = false }: { light?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const iconColor = light ? colors.ink : '#FFFFFFCC';

  return (
    // GlassView is a native module like LinearGradient elsewhere in this
    // header (see HomeHeader.tsx's own note) — className is silently
    // ignored on it, layout has to go through style instead.
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      colorScheme={light ? 'light' : 'dark'}
      style={[
        styles.pill,
        Platform.OS !== 'ios' &&
          (light
            ? { backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(16,28,16,0.12)' }
            : { backgroundColor: 'rgba(20,20,20,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }),
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Wishlist"
        className="h-11 w-11 items-center justify-center active:opacity-70"
        onPress={() => navigation.navigate('Wishlist')}
      >
        <AppIcon icon={HeartIcon} size={19} color={iconColor} strokeWidth={1.8} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile"
        className="h-11 w-11 items-center justify-center active:opacity-70"
        onPress={() => navigation.navigate('Profile')}
      >
        <AppIcon icon={UserIcon} size={19} color={iconColor} strokeWidth={1.8} />
      </Pressable>
    </GlassView>
  );
}
