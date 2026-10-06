import { Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import type { OrderItemSummary } from '../data';

const MAX_SLOTS = 5;

// Five equal cells fill the card. Large orders reserve the final cell
// for the exact number of product rows that are not pictured.
export function OrderProductPreview({ items }: { items: OrderItemSummary[] }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, items.length > MAX_SLOTS ? MAX_SLOTS - 1 : MAX_SLOTS);
  const hiddenCount = items.length - visible.length;
  const usedSlots = visible.length + (hiddenCount > 0 ? 1 : 0);

  return (
    <View className="mt-3 flex-row gap-2" accessible accessibilityLabel={`${visible.map((item) => item.name).join(', ')}${hiddenCount > 0 ? `, plus ${hiddenCount} more products` : ''}`}>
      {visible.map((item, index) => (
        <View key={`${item.productId}-${index}`} className="overflow-hidden rounded-xl bg-[#F6F7F9] p-1" style={{ flex: 1, minWidth: 0, aspectRatio: 1 }}>
          <AppImage source={{ uri: item.imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
        </View>
      ))}
      {hiddenCount > 0 && (
        <View className="items-center justify-center rounded-xl bg-[#EEF1F5]" style={{ flex: 1, minWidth: 0, aspectRatio: 1 }}>
          <Text className="text-[16px] font-bold text-ink">+{hiddenCount}</Text>
          <Text className="text-[11px] font-medium text-ink/55">more</Text>
        </View>
      )}
      {Array.from({ length: MAX_SLOTS - usedSlots }, (_, index) => <View key={`empty-${index}`} style={{ flex: 1 }} />)}
    </View>
  );
}
