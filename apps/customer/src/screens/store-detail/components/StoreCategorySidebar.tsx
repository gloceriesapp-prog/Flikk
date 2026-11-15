import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
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
            className="min-h-16 items-center justify-center gap-1.5 px-2 py-3"
            style={{ backgroundColor: item.id === selectedId ? '#FFFFFF' : 'transparent',
              borderRightWidth: item.id === selectedId ? 3 : 0, borderRightColor: '#155DFC' }}>
            {item.id !== 'all' && (
              <View className="h-16 w-16 overflow-hidden rounded-xl bg-[#EDEDF0]">
                <AppImage source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
                  accessible={false} className="h-full w-full" contentFit="contain" />
              </View>
            )}
            <Text numberOfLines={2} className={`text-center text-[12px] leading-4 ${item.id === selectedId ? 'font-bold text-ink' : 'font-medium text-ink/60'}`}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
