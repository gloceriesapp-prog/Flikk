// Placeholder for PRD screen C3 (Home). Full discovery/browse UI is a separate
// piece of work (specs/01-customer-app/screens.md) — this just proves the
// post-auth handoff, and now the location flow, work end to end.

import { Text, View } from 'react-native';
import { useLocationStore } from '../store/useLocationStore';

export function HomeScreen() {
  const location = useLocationStore((s) => s.location);

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-mist px-6 pb-safe pt-safe">
      <Text className="text-base font-semibold text-ink">You&apos;re in. Home screen goes here.</Text>
      {location && (
        <Text className="text-center text-sm text-ink/60">Delivering to {location.addressLabel}</Text>
      )}
    </View>
  );
}
