// Shared "grid of sub-category tiles" layout — used by groceries/, bakery/,
// essentials/. Heading is optional: Groceries deliberately shows no heading
// above its grid (an explicit ask), Bakery/Essentials still pass one.
//
// Exactly 4 columns, guaranteed — each cell is a true 25% width (not
// 23%+margin, which summed to just over 100% once floating-point rounding
// hit all 4 columns in a full row and made Yoga wrap the 4th tile early).
// The visual gap comes from equal horizontal padding on every cell plus a
// matching negative margin on the row, not from arithmetic that has to add
// up to exactly 100%.

import { Text, View } from 'react-native';
import { SubCategoryTile } from './SubCategoryTile';
import type { SubCategory } from '../types';

interface Props {
  title?: string;
  items: SubCategory[];
}

const GAP = 12;

export function SubCategoryGrid({ title, items }: Props) {
  return (
    <View className="px-5 pt-6">
      {title && <Text className="mb-4 text-xl font-bold text-ink">{title}</Text>}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -GAP / 2 }}>
        {items.map((category) => (
          <View key={category.id} style={{ width: '25%', paddingHorizontal: GAP / 2, paddingBottom: 20 }}>
            <SubCategoryTile category={category} />
          </View>
        ))}
      </View>
    </View>
  );
}
