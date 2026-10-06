import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import type { Category } from '../data/categoryTabs';

export function QuickCategoryCard({ category, onSelect, imageUrl, imageBottomBleed = 0, imageScale = 1 }: {
  category: Category;
  onSelect: (id: string) => void;
  imageUrl?: string;
  imageBottomBleed?: number;
  imageScale?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category.label}`}
      onPress={() => onSelect(category.id)}
      className="h-[112px] w-full overflow-hidden rounded-[22px]  bg-white pt-1 active:bg-[#F7F8FA]"
    >
      <Text className="px-3 text-center text-[15px] font-bold leading-[20px] text-black" numberOfLines={2}>{category.label}</Text>
      {imageUrl && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="w-full flex-1 overflow-hidden">
          <AppImage
            source={{ uri: imageUrl }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: `${-imageBottomBleed}%`, height: `${100 + imageBottomBleed}%`, transform: [{ scale: imageScale }] }}
            resizeMode="contain"
            contentPosition="bottom center"
            accessible={false}
          />
        </View>
      )}
    </Pressable>
  );
}
