import { Text, View } from 'react-native';
import { AppImage } from '../AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';

export const CATEGORY_TILE_BG = '#F2F2F2';
export function CategoryTileContent({ title, imageUrl, backgroundColor = CATEGORY_TILE_BG }: { title: string; imageUrl?: string; backgroundColor?: string }) {
  return <>
    <View style={{ aspectRatio: 0.85, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor }}>
      <AppImage source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} style={{ width: '90%', height: '90%' }} resizeMode="contain" accessible={false} />
    </View>
    <Text className="mt-1.5 px-0.5 text-center text-[13px] font-bold leading-[16px] text-black/80" numberOfLines={2}>{title}</Text>
  </>;
}
