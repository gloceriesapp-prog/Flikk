// Everything shown when the "Groceries" category tab is selected on Home —
// sub-category grid, promo banner, then a farm-products teaser row. See
// HomeScreen.tsx for how category selection routes here. Building blocks
// come from ../category-tab/ — shared with bakery/ and essentials/.

import { View } from 'react-native';
import { PromoBanner } from '../category-tab/components/PromoBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { FARM_PRODUCTS, GROCERY_SUBCATEGORIES } from './data';

export function GroceriesTab() {
  return (
    <View className="pb-4">
      <SubCategoryGrid title="Daily fresh essentials" items={GROCERY_SUBCATEGORIES} />
      <PromoBanner
        badgeLabel="Fresh Picks"
        heading={'Cook the way\nyou love.'}
        subheading="Stir, simmer, soup & serve — same day."
      />
      <ProductTeaserRow title="Straight from farms" products={FARM_PRODUCTS} />
    </View>
  );
}
