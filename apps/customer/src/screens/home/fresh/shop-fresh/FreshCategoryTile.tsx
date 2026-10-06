import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { AppImage as Image } from '../../../../components/AppImage';
import type { FreshCategory } from './data';

interface Props {
  category: FreshCategory;
  imageUrl?: string;
  onPress: () => void;
}

export function FreshCategoryTile({ category, imageUrl, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Shop ${category.title.toLowerCase()}`} onPress={onPress} className="items-center gap-2.5 active:opacity-80">
      <View className="relative aspect-[4/4.6] w-full items-center justify-center overflow-hidden" style={{ backgroundColor: category.tint, borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 h-[22%]" style={{ backgroundColor: category.accent, opacity: 0.12 }} />
        <View pointerEvents="none" className="absolute bottom-[12%] h-2 w-[64%] rounded-full" style={{ backgroundColor: category.accent, opacity: 0.1 }} />
        {imageUrl ? <Image source={{ uri: imageUrl }} className="h-[80%] w-[88%]" resizeMode="contain" /> : <AppIcon icon={category.icon} size={40} color={category.accent} strokeWidth={1.5} />}
      </View>
      <Text className="min-h-8 text-center text-[13px] font-bold leading-[17px] tracking-[-0.2px] text-ink" numberOfLines={2}>{category.title}</Text>
    </Pressable>
  );
}
