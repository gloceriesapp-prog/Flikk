// Everything shown when the "Groceries" category tab is selected on Home —
// sub-category grid, promo poster, then a farm-products teaser row. See
// HomeScreen.tsx for how category selection routes here. Sub-category grid
// and teaser row come from ../category-tab/. Poster is real admin data
// (Home Categories -> "Groceries" tab's own "Ads & posters" section), image
// only — no hardcoded dummy image anymore (GroceriesDealImage.tsx, its old
// fixed "deal1.jpeg", is gone) and no text overlay; the section renders
// only when a founder has actually added one.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { FARM_PRODUCTS, GROCERY_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function GroceriesTab({ banner }: Props) {
  return (
    <View className="pb-4">
      <SubCategoryGrid items={GROCERY_SUBCATEGORIES} />
      {banner && <PosterBanner imageUri={banner.imageUrl} />}
      <ProductTeaserRow title="Straight from farms" products={FARM_PRODUCTS} />
    </View>
  );
}
