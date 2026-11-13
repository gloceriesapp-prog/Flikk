import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { CategoryTileContent } from '../../../../components/CategorySections/CategoryTileContent';
import type { HomeContentItem } from '../../content/contracts';

interface Props {
  items: HomeContentItem[];
  imageForItem: (item: HomeContentItem) => string | undefined;
  onOpen: (item: HomeContentItem) => void;
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'horizontal';
}
const GAP = 8;
export function GroceryCategoryGrid({ items, imageForItem, onOpen, columns = 4, layout = 'grid' }: Props) {
  const { width } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const featuredGrid = layout === 'grid' && columns === 4;
  // Match the Categories grid gutters. The lead card spans two slots while
  // every photo panel keeps the same height, including after rotation.
  const normalWidth = Math.max(1, ((measuredWidth ?? width) - 24) / columns - GAP);
  const artworkHeight = featuredGrid ? normalWidth / 0.85 : undefined;
  const tile = (item: HomeContentItem) => <Pressable accessibilityRole="button" accessibilityLabel={`Shop ${item.title}`} onPress={() => onOpen(item)} className="w-full active:opacity-80">
    <CategoryTileContent title={item.title} imageUrl={imageForItem(item)} artworkHeight={artworkHeight} />
  </Pressable>;
  if (layout === 'horizontal') return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}>
    {items.map(item => <View key={item.id} style={{ width: Math.max(1, (width - 24) / columns - GAP) }}>{tile(item)}</View>)}
  </ScrollView>;
  return <View className="px-4" onLayout={event => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) setMeasuredWidth(previous => previous !== null && Math.abs(previous - next) < 0.5 ? previous : next);
  }}><View className="flex-row flex-wrap" style={{ marginHorizontal: -GAP / 2 }}>
    {items.map((item, index) => <View key={item.id} testID="grocery-category-cell" style={{ width: `${100 / columns * (featuredGrid && index === 0 ? 2 : 1)}%`, paddingHorizontal: GAP / 2, paddingBottom: 20 }}>{tile(item)}</View>)}
  </View></View>;
}
