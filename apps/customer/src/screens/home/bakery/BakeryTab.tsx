// Everything shown when the "Bakery" category tab is selected on Home.
// Building blocks come from ../category-tab/ — same shared pieces as
// groceries/ and essentials/, just different data and copy.

import { View } from 'react-native';
import { PromoBanner } from '../category-tab/components/PromoBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { BAKERY_PRODUCTS, BAKERY_SUBCATEGORIES } from './data';

export function BakeryTab() {
  return (
    <View className="pb-4">
      <SubCategoryGrid title="Freshly baked, daily" items={BAKERY_SUBCATEGORIES} />
      <PromoBanner
        badgeLabel="Baked Fresh"
        heading={'Warm from\nthe oven.'}
        subheading="Baked every morning, delivered while it's still warm."
        imageSeed="flikk-bakery-promo"
      />
      <ProductTeaserRow title="Straight from the bakery" products={BAKERY_PRODUCTS} />
    </View>
  );
}
