import { View, useWindowDimensions } from 'react-native';
import { BLOCK_BG, BLOCK_RADIUS, GAP, MARGIN, RADIUS, SIDE, gridMetrics } from '../layout';

// Same geometry as the live grid, so nothing jumps when data arrives.
export function TodayGridSkeleton() {
  const { width } = useWindowDimensions();
  const { column, cardHeight, heroHeight } = gridMetrics(width);
  const box = (w: number, h: number) => (
    <View style={{ width: w, height: h, borderRadius: RADIUS, backgroundColor: 'rgba(255,255,255,0.7)' }} />
  );
  return (
    <View accessibilityLabel="Loading today’s picks" testID="today-grid-skeleton" style={{ marginHorizontal: MARGIN, padding: SIDE, paddingTop: 0, overflow: 'hidden', borderRadius: BLOCK_RADIUS, backgroundColor: BLOCK_BG }}>
      <View className="mb-2.5 bg-white/60" style={{ marginHorizontal: -SIDE, aspectRatio: 3 }} />
      <View className="flex-row" style={{ gap: GAP }}>
        {box(column, heroHeight)}
        <View className="flex-row flex-wrap" style={{ gap: GAP, width: column * 2 + GAP }}>
          {[0, 1, 2, 3].map((i) => <View key={i}>{box(column, cardHeight)}</View>)}
        </View>
      </View>
    </View>
  );
}
