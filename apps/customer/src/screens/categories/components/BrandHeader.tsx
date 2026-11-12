import { View } from 'react-native';
import { AppImage } from '../../../components/AppImage';

interface Props {
  brand: { name: string; imageUrl: string | null; bannerUrl?: string | null };
}

export function BrandHeader({ brand }: Props) {
  if (brand.bannerUrl) return (
    <View className="mb-5 overflow-hidden rounded-2xl">
      <AppImage accessibilityLabel={`${brand.name} banner`} source={{ uri: brand.bannerUrl }}
        style={{ width: '100%', aspectRatio: 2.5 }} contentFit="cover" />
    </View>
  );
  if (!brand.imageUrl) return null;
  return (
    <View className="mb-5 items-center rounded-2xl bg-gray-100 py-4">
      <AppImage accessibilityLabel={`${brand.name} logo`} source={{ uri: brand.imageUrl }}
        style={{ width: 96, height: 96 }} contentFit="contain" />
    </View>
  );
}
