import { Text, View } from 'react-native';

export function PurchaseLoadingMessage() {
  return <View className="items-center px-6 py-16" accessibilityLiveRegion="polite">
    <Text className="text-center text-[15px] font-medium text-ink/60">Bringing your purchases together…</Text>
  </View>;
}
