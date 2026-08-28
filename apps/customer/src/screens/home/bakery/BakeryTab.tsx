// Everything shown when the "Bakery" category tab is selected on Home.
// Building blocks come from ../category-tab/. Poster is real admin data
// (Home Categories -> "Bakery" tab's own "Ads & posters" section), image
// only — no hardcoded dummy copy/photo anymore; the section renders only
// when a founder has actually added one.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { BAKERY_PRODUCTS, BAKERY_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function BakeryTab({ banner }: Props) {
  return (
    <View className="pb-4">
      <SubCategoryGrid title="Freshly baked, daily" items={BAKERY_SUBCATEGORIES} />
      {banner && <PosterBanner imageUri={banner.imageUrl} />}
      <ProductTeaserRow title="Straight from the bakery" products={BAKERY_PRODUCTS} />
    </View>
  );
}
