import { Pressable, Text, View } from 'react-native';
export function UpiDiscoveryStatus({ loading, error, count, onRetry }: { loading: boolean; error: string; count: number; onRetry: () => void }) {
  if (!loading && !error && count > 0) return null;
  return <View className="gap-2 rounded-xl bg-white p-4">
    <Text accessibilityLiveRegion="polite" className="text-[13px] leading-5 text-ink/60">
      {loading ? 'Checking installed UPI apps…' : error || 'No supported UPI apps found. Install a UPI app, then check again.'}
    </Text>
    {!loading && <Pressable accessibilityRole="button" accessibilityLabel="Check UPI apps again" onPress={onRetry} className="min-h-11 justify-center">
      <Text className="text-[13px] font-semibold text-primary">Check UPI apps again</Text>
    </Pressable>}
  </View>;
}
