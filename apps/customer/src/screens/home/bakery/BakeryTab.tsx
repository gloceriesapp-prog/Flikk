// Everything shown when the "Bakery" category tab is selected on Home.
// Redesigned per an explicit ask for more premium-ness + easier browsing —
// what changed and why:
//
// 1. BakeryFreshnessBanner (new) — freshness is the actual trust signal
//    this category sells on, so it opens the tab instead of a product
//    grid cold-opening it, same idea RegionalTab's own hero establishes
//    for "local pride."
// 2. SubCategoryGrid stays as-is (shared with groceries/, essentials/ —
//    restyling it here would silently change those tabs too, out of
//    scope for a Bakery-only ask).
// 3. "Fresh Today" row (new) — items with a real freshnessTag set
//    (data.ts), reusing ProductCardView's own freshness-ribbon UI that
//    already existed but nothing in this tab was using. Only renders
//    when at least one product actually has the tag, same "don't show an
//    empty/fake row" discipline every other Home section follows.
// 4. Poster is real admin data (Home Categories -> "Bakery" tab's own
//    "Ads & posters" section), image only — no hardcoded dummy copy/photo.
// 5. Main product row retitled to read less like a generic label.
//
// Building blocks come from ../category-tab/.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { BakeryFreshnessBanner } from './BakeryFreshnessBanner';
import { BAKERY_PRODUCTS, BAKERY_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function BakeryTab({ banner }: Props) {
  const freshTodayProducts = BAKERY_PRODUCTS.filter((product) => product.freshnessTag);

  return (
    // pb-32 (not pb-4) — this is the last row in the tab, and the
    // floating CartBar ("Unlock FREE Delivery"/"View cart") sits on top
    // of BottomNavBar once the cart has items, adding real height beyond
    // what the outer ScrollView's own bottom padding accounts for. Not
    // enough clearance here let those floating bars cover the last
    // product row's own name/price text.
    <View className="pb-32">
      <BakeryFreshnessBanner />

      <SubCategoryGrid title="Freshly baked, daily" items={BAKERY_SUBCATEGORIES} />

      {freshTodayProducts.length > 0 && <ProductTeaserRow title="Fresh Today" products={freshTodayProducts} />}

      {banner && <PosterBanner imageUri={banner.imageUrl} />}

      <ProductTeaserRow title="Customer favourites" products={BAKERY_PRODUCTS} />
    </View>
  );
}
