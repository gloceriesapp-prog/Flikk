// What ErrorBoundary renders after an uncaught render error. Deliberately
// self-contained (no navigation, query client or store reads): it has to
// render even when the thing that crashed was one of those providers.

import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';

interface Props {
  onReset: () => void;
  // Raw error text for development builds only; null in release builds.
  debugDetails: string | null;
}

export function ErrorFallback({ onReset, debugDetails }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.danger}14` }}>
        <AppIcon icon={AlertCircleIcon} size={38} color={colors.danger} strokeWidth={1.8} />
      </View>

      <Text className="mt-6 text-center text-[22px] font-bold text-ink">Something went wrong</Text>
      <Text className="mt-2 text-center text-[15px] leading-6 text-ink/55">
        That&apos;s on us, not you. Tap below to reload this screen. Your active orders are safe.
      </Text>

      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        className="mt-8 w-full items-center rounded-2xl bg-ink py-4"
      >
        <Text className="text-[15px] font-semibold text-white">Try again</Text>
      </Pressable>

      {debugDetails ? (
        <ScrollView className="mt-6 max-h-64 w-full rounded-xl bg-ink p-3">
          <Text style={{ color: colors.coral, fontFamily: 'Courier', fontSize: 11 }}>{debugDetails}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
