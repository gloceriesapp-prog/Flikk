import { Pressable } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { Product } from '../../products/types';
import type { LocalPantryBrand } from './data';

interface Props {
  brand: LocalPantryBrand & { products: Product[] };
  previewOnly: boolean;
  onPress: () => void;
}

export function LocalBrandCard({ brand, previewOnly, onPress }: Props) {
  const imageUri = brand.imageUrl || brand.products.find((product) => product.imageUrl)?.imageUrl || PLACEHOLDER_IMAGE_URI;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${previewOnly ? 'Preview concept brand' : 'Explore verified local brand'} ${brand.name}`}
      onPress={onPress}
      className="aspect-square flex-1 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6]"
    >
      <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="contain" />
    </Pressable>
  );
}
