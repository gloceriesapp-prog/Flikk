// Dedicated "allow live location" step shown BEFORE the map ever opens —
// mirrors apps/customer's own LocationPermissionScreen (explanatory copy +
// one primary button), the pattern that keeps the customer flow from
// crashing: permission is requested and the OS dialog fully dismissed while
// a stable, long-lived screen is still mounted, so no getCurrentPositionAsync
// ever fires against the Activity mid-recreation (geocoding.ts's own note on
// that native crash). Rendered as a full-screen Modal rather than a nav
// route so the onboarding/change-location stacks don't each need a new
// registered screen for a one-shot gate.
//
// Blue accent is colors.primary (#155DFC) throughout — this app's own CTA
// language, not the customer app's.

import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Location05Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';

interface Props {
  visible: boolean;
  loading?: boolean;
  error?: string | null;
  // Requests permission, then proceeds into the map regardless of the
  // outcome (manual pinning still works if it's denied).
  onAllow: () => void;
  // "Not now" — proceed into the map without live location.
  onDismiss: () => void;
}

export function LocationPermissionScreen({ visible, loading, error, onAllow, onDismiss }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onDismiss}>
      <View className="flex-1 bg-white pt-safe">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: `${colors.primary}14` }}>
            <AppIcon icon={Location05Icon} size={34} color={colors.primary} />
          </View>
          <Text accessibilityRole="header" className="mt-7 text-center text-2xl font-bold text-ink">
            Share your store&rsquo;s location
          </Text>
          <Text className="mt-3 text-center text-[15px] font-medium leading-[22px] text-ink/55">
            Gloceries uses your location to drop the map pin on your store so riders can find it. Your exact pin is only ever used for pickups.
          </Text>
          {error ? (
            <Text accessibilityLiveRegion="polite" className="mt-4 text-center text-[13px] font-medium text-danger">
              {error}
            </Text>
          ) : null}
        </View>

        <View className="gap-3 px-6 pb-safe-offset-6">
          <Pressable
            accessibilityRole="button"
            onPress={onAllow}
            disabled={loading}
            className="h-[52px] flex-row items-center justify-center rounded-full"
            style={({ pressed }) => ({ backgroundColor: colors.primary, opacity: pressed || loading ? 0.9 : 1 })}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">Enable location access</Text>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDismiss} disabled={loading} className="py-2">
            <Text className="text-center text-[15px] font-semibold text-ink/60">Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
