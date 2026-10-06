import { Text, View } from 'react-native';
import type { LocalPantryBrand } from '../../groceries/local-brands/data';

interface Props {
  brand: LocalPantryBrand;
  previewOnly: boolean;
}

export function DistrictBrandCard({ brand, previewOnly }: Props) {
  const verified = !previewOnly && brand.verified;
  const origin = brand.origin.trim() || 'Origin not provided';
  return (
    <View
      accessible
      accessibilityLabel={`${previewOnly ? 'Design concept' : verified ? 'Verified district brand' : 'Brand'}: ${brand.name}. Origin: ${origin}`}
      className="min-h-[72px] w-full items-center justify-center rounded-[22px] border-2 border-[#242424] bg-white px-2 py-3"
    >
      <Text
        numberOfLines={2}
        className="w-full text-center text-[13px] font-bold leading-[18px] text-[#242424]"
      >
        {brand.name}
      </Text>
    </View>
  );
}
