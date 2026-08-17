// Everything shown when the "Essentials" category tab is selected on Home.
// Building blocks come from ../category-tab/ — same shared pieces as
// groceries/ and bakery/, just different data and copy.

import { View } from 'react-native';
import { PromoBanner } from '../category-tab/components/PromoBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { ESSENTIALS_PRODUCTS, ESSENTIALS_SUBCATEGORIES } from './data';

export function EssentialsTab() {
  return (
    <View className="pb-4">
      <SubCategoryGrid title="Home essentials, sorted" items={ESSENTIALS_SUBCATEGORIES} />
      <PromoBanner
        badgeLabel="Top Rated"
        heading={'Everyday\nmust-haves.'}
        subheading="Everything you need, one tap away."
      />
      <ProductTeaserRow title="Everyday must-haves" products={ESSENTIALS_PRODUCTS} />
    </View>
  );
}
