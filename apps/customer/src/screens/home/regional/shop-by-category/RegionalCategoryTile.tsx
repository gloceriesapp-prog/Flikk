import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../../../components/AppIcon';
import { AppImage as Image } from '../../../../components/AppImage';
import type { RegionalCategory } from './data';

interface Props {
  category: RegionalCategory;
  imageUrl?: string;
  onPress: () => void;
}

export function RegionalCategoryTile({ category, imageUrl, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Shop ${category.title.toLowerCase()}`} onPress={onPress} className="items-center gap-2.5 active:opacity-75">
      <View className="relative aspect-square w-full items-center justify-center overflow-hidden rounded-[22px] border border-ink/5" style={{ backgroundColor: category.tint }}>
        <LinearGradient colors={['#FFFFFF', category.tint, category.tint]} locations={[0, 0.4, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View pointerEvents="none" className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full" style={{ backgroundColor: category.accent, opacity: 0.08 }} />
        {imageUrl ? <Image source={{ uri: imageUrl }} className="h-[84%] w-[84%]" resizeMode="contain" /> : <View className="h-[64%] w-[64%] items-center justify-center rounded-full border border-white/80 bg-white/50"><AppIcon icon={category.icon} size={36} color={category.accent} strokeWidth={1.5} /></View>}
      </View>
      <Text numberOfLines={2} className="min-h-9 text-center text-[13px] font-bold leading-[17px] text-ink">{category.title}</Text>
    </Pressable>
  );
}
