import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function MapLoadingState({ onRetry }: { onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, []);
  return <View testID="map-loading-cover" style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', paddingBottom: 180 }]}>
    <View className="max-w-[280px] items-center gap-3 rounded-2xl bg-[#F4F5F7] px-5 py-4">
      {!slow && <ActivityIndicator color="#155DFC" />}
      <Text accessibilityLiveRegion="polite" className="text-center text-[14px] font-medium text-[#373737]">{slow ? 'The map is taking longer to load' : 'Loading map…'}</Text>
      {slow && <>
        <Text className="text-center text-[12px] leading-[18px] text-[#737373]">Check your internet connection and try again.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading map" onPress={onRetry}
          className="min-h-11 justify-center rounded-xl bg-white px-5 py-2.5">
          <Text className="text-[14px] font-semibold text-[#155DFC]">Retry map</Text>
        </Pressable>
      </>}
    </View>
  </View>;
}
