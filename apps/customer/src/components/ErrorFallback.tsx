// The actual visual ErrorBoundary.tsx renders on an uncaught render error —
// pulled out so ErrorScreen.tsx (a routable TEMP-root screen, AppNavigator
// .tsx's own note) can show this exact real UI for design iteration
// instead of a second, invented one. Same white background HomeScreen.tsx's
// own root uses (not colors.mist) per an explicit ask. The dev-only raw
// stack-trace box is gone — still logged to Metro/device console via
// ErrorBoundary's own componentDidCatch, just not rendered on screen
// anymore.

import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';

interface Props {
  onReset: () => void;
}

export function ErrorFallback({ onReset }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.danger}14` }}>
        <AppIcon icon={AlertCircleIcon} size={38} color={colors.danger} strokeWidth={1.8} />
      </View>

      <Text className="mt-6 text-center text-[22px] font-bold text-ink">Something went wrong</Text>
      <Text className="mt-2 text-center text-[15px] leading-6 text-ink/55">That&apos;s on us, not you. Try again in a moment.</Text>

      <Pressable
        onPress={onReset}
        className="mt-8 w-full items-center rounded-2xl bg-ink py-4 shadow-lg shadow-black/20"
        style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Text className="text-[15px] font-semibold text-white">Try Again</Text>
      </Pressable>
    </View>
  );
}
