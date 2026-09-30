// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// This bar just looks like an input and shows the rolling search-term hint
// (RotatingSearchHint). Same expo-glass-effect Liquid Glass treatment as the
// heart/bookmark pill beside it and the profile pill (DeliveryModeSwitcher):
// pure GlassView (real Liquid Glass on iOS, translucent-white fallback on
// Android/web since the library renders an unstyled View there). No white
// fill, no shadow — the glass IS the surface.
//
// Beside the bar (a real sibling, NOT inside the input) sits a separate
// glass pill holding the Wishlist (heart) + Shopping-list (clipboard)
// shortcuts, moved down here from the top header pill per an explicit ask
// (top pill is now profile-only).

import { ClipboardListIcon, HeartIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { GlassView } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  onPress: () => void;
}

// Android/web fallback — GlassView renders an unstyled View there, so give it
// the same translucent-white backing + hairline border the other glass pills
// use so it still reads as a surface. Same values as actionsPill.
const androidGlassFallback =
  Platform.OS !== 'ios'
    ? { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(16,28,16,0.10)' }
    : null;

const styles = StyleSheet.create({
  // Same 52px height + fully-rounded shape on both pills so they read as one
  // aligned row. Layout via style since GlassView ignores className.
  inputPill: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actionsPill: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 999,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
});

export function HomeSearchBar({ onPress }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View className="mt-1.5 flex-row items-center gap-2">
      <GlassView glassEffectStyle="regular" isInteractive colorScheme="light" style={[styles.inputPill, androidGlassFallback]}>
        <Pressable onPress={onPress} className="h-full w-full flex-row items-center px-4">
          <View className="pr-2">
            <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
          </View>
          <View className="flex-1">
            <RotatingSearchHint />
          </View>
        </Pressable>
      </GlassView>

      <GlassView glassEffectStyle="regular" isInteractive colorScheme="light" style={[styles.actionsPill, androidGlassFallback]}>
        <Pressable hitSlop={6} onPress={() => navigation.navigate('Wishlist')}>
          <AppIcon icon={HeartIcon} size={19} color={colors.ink} strokeWidth={1.8} />
        </Pressable>
        <Pressable hitSlop={6} onPress={() => navigation.navigate('ShoppingList')}>
          <AppIcon icon={ClipboardListIcon} size={19} color={colors.ink} strokeWidth={1.8} />
        </Pressable>
      </GlassView>
    </View>
  );
}
