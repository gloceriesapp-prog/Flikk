import { View, useWindowDimensions } from 'react-native';
import { BORDER, CARD_RADIUS, GAP, HERO_RADIUS, SIDE, gridMetrics } from '../layout';

// Same geometry as the live grid, so nothing jumps when data arrives.
export function TodayGridSkeleton() {
  const { width } = useWindowDimensions();
  const { column, cardHeight, heroHeight } = gridMetrics(width);
  const box = (w: number, h: number, radius: number) => (
    <View style={{ width: w, height: h, borderRadius: radius, borderWidth: 1, borderColor: BORDER, backgroundColor: '#F6F7F9' }} />
  );
  return (
    <View accessibilityLabel="Loading today’s picks" testID="today-grid-skeleton" style={{ paddingHorizontal: SIDE }}>
      <View className="mb-2.5 h-5 w-44 rounded bg-[#EEF0F4]" />
      <View className="flex-row" style={{ gap: GAP }}>
        {box(column, heroHeight, HERO_RADIUS)}
        <View className="flex-row flex-wrap" style={{ gap: GAP, width: column * 2 + GAP }}>
          {[0, 1, 2, 3].map((i) => <View key={i}>{box(column, cardHeight, CARD_RADIUS)}</View>)}
        </View>
      </View>
    </View>
  );
}
