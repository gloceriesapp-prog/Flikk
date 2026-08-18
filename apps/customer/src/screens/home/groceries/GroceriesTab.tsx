// Everything shown when the "Groceries" category tab is selected on Home —
// sub-category grid, deal image, then a farm-products teaser row. See
// HomeScreen.tsx for how category selection routes here. Sub-category grid
// and teaser row come from ../category-tab/ (shared with bakery/ and
// essentials/); GroceriesDealImage is specific to this tab only.

import { View } from 'react-native';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { GroceriesDealImage } from './GroceriesDealImage';
import { FARM_PRODUCTS, GROCERY_SUBCATEGORIES } from './data';

export function GroceriesTab() {
  return (
    <View className="pb-4">
      <SubCategoryGrid items={GROCERY_SUBCATEGORIES} />
      <GroceriesDealImage />
      <ProductTeaserRow title="Straight from farms" products={FARM_PRODUCTS} />
    </View>
  );
}
