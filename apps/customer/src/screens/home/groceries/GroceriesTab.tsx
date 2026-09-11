// Everything shown when the "Groceries" category tab is selected on Home —
// a top banner slot (reserved, not built yet — see this component's own
// note below), sub-category grid, a brand-spotlight row, promo poster,
// then a farm-products teaser row. See HomeScreen.tsx for how category
// selection routes here. Sub-category grid and teaser row come from
// ../category-tab/. Poster is real admin data (Home Categories ->
// "Groceries" tab's own "Ads & posters" section), image only — no
// hardcoded dummy image anymore (GroceriesDealImage.tsx, its old fixed
// "deal1.jpeg", is gone) and no text overlay; the section renders only
// when a founder has actually added one.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { BrandSpotlightSection } from './components/BrandSpotlightSection';
import { FARM_PRODUCTS, GROCERY_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function GroceriesTab({ banner }: Props) {
  return (
    <View className="pb-32">
      {/* TODO: top banner — reserved slot, per an explicit "we will add it
          later" ask. Nothing renders here yet on purpose; not the same
          banner prop as PosterBanner below (that one's already real admin
          data, further down the tab). */}
      {banner && <PosterBanner imageUri={banner.imageUrl} />}
      <BrandSpotlightSection />
      <SubCategoryGrid items={GROCERY_SUBCATEGORIES} />
      <ProductTeaserRow title="Straight from farms" products={FARM_PRODUCTS} />
    </View>
  );
}
