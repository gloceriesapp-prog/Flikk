import { Pressable, ScrollView, Text, View } from 'react-native';
import type { StoreCategory } from '../useStoreProducts';

export function StoreCategorySidebar({ items, selectedId, onSelect }: {
  items: StoreCategory[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <View style={{ width: 88 }} className="bg-[#F6F6F6]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
        {items.map(item => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label}
            accessibilityState={{ selected: item.id === selectedId }} onPress={() => onSelect(item.id)}
            className="min-h-16 justify-center px-2 py-4"
            style={{ backgroundColor: item.id === selectedId ? '#FFFFFF' : 'transparent',
              borderRightWidth: item.id === selectedId ? 3 : 0, borderRightColor: '#155DFC' }}>
            <Text className={`text-center text-[12px] leading-4 ${item.id === selectedId ? 'font-bold text-ink' : 'font-medium text-ink/60'}`}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
