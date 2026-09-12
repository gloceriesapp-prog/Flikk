// Everything shown when the "Groceries" category tab is selected on Home —
// a top banner slot (reserved, not built yet — see this component's own
// note below), sub-category grid, then a promo poster. See HomeScreen.tsx
// for how category selection routes here. Sub-category grid comes from
// ../category-tab/ (GROCERY_SUBCATEGORIES is category-tile data — labels
// and icons, not product cards, so it's unaffected by the product-card
// dummy-data removal below). Poster is real admin data (Home Categories ->
// "Groceries" tab's own "Ads & posters" section), image only — no
// hardcoded dummy image anymore (GroceriesDealImage.tsx, its old fixed
// "deal1.jpeg", is gone) and no text overlay; the section renders only
// when a founder has actually added one.
//
// BrandSpotlightSection ("Snack Stash") and the "Straight from farms"
// teaser row (FARM_PRODUCTS) are both gone — per an explicit ask to strip
// every product-card dummy dataset out of the app. Neither had a real
// backing feed (no "featured brand"/"farm produce" concept exists in the
// schema), so removing the dummy data means removing the section, not
// swapping in a fake-real substitute. Re-add once a real source exists
// (e.g. an admin/partner-managed "featured" flag on real products).

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { GROCERY_SUBCATEGORIES } from './data';

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
      <SubCategoryGrid items={GROCERY_SUBCATEGORIES} />
    </View>
  );
}
