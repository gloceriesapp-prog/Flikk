// Everything shown when the "Protein" category tab is selected on Home.
// Building blocks come from ../category-tab/ — same shared pieces as
// bakery/, groceries/, essentials/, just different data and copy.
// PromoBanner gets its own real photo (PROTEIN_BANNER_IMAGE_URI) instead of
// the shared placeholder, via that component's optional imageUri prop.
//
// SubCategoryGrid's title is omitted (unset, not an empty string) — same
// pattern GroceriesTab.tsx uses for its own grid, per an explicit ask to
// drop the heading here too.

import { View } from 'react-native';
import { PromoBanner } from '../category-tab/components/PromoBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { PROTEIN_BANNER_IMAGE_URI, PROTEIN_PRODUCTS, PROTEIN_SUBCATEGORIES } from './data';

export function ProteinTab() {
  return (
    <View className="pb-4">
      <SubCategoryGrid items={PROTEIN_SUBCATEGORIES} />
      <PromoBanner
        imageUri={PROTEIN_BANNER_IMAGE_URI}
        badgeLabel="High Protein"
        heading={'Fuel your\nday right.'}
        subheading="Whey, gainers, creatine, and more — everyday sports nutrition."
      />
      <ProductTeaserRow title="Everyday protein" products={PROTEIN_PRODUCTS} />
    </View>
  );
}
