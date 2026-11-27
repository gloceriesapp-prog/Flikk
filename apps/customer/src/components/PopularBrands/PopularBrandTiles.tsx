import { useState } from 'react';
import { View } from 'react-native';
import type { PopularBrand } from '../../api/brands';
import { BrandTile } from './BrandTile';

const GAP = 10;

// Grid of brand tiles (4 or 5 per row), same tile as the Popular Brands row.
export function PopularBrandTiles({ brands, onSelect, columns = 5 }: {
  brands: PopularBrand[];
  onSelect: (brand: PopularBrand) => void;
  columns?: 4 | 5;
}) {
  const [width, setWidth] = useState(0);
  const size = width ? Math.floor((width - GAP * (columns - 1)) / columns) : 0;
  return (
    <View className="flex-row flex-wrap px-4" style={{ gap: GAP }}
      onLayout={event => setWidth(event.nativeEvent.layout.width - 32)}>
      {size > 0 && brands.map(brand => <BrandTile key={brand.id} brand={brand} size={size} onPress={() => onSelect(brand)} />)}
    </View>
  );
}
