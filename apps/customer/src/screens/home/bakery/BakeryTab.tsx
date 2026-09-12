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
// 3. Poster is real admin data (Home Categories -> "Bakery" tab's own
//    "Ads & posters" section), image only — no hardcoded dummy copy/photo.
//
// Building blocks come from ../category-tab/.
//
// The "Fresh Today" and "Customer favourites" product rows (BAKERY_PRODUCTS)
// are gone — per an explicit ask to strip every product-card dummy dataset
// out of the app. No real Bakery-scoped catalog feed exists yet; re-add
// once one does (e.g. an admin/partner-managed catalog filtered to this
// category), not with fabricated data in the meantime.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { BakeryFreshnessBanner } from './BakeryFreshnessBanner';
import { BAKERY_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function BakeryTab({ banner }: Props) {
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

      {banner && <PosterBanner imageUri={banner.imageUrl} />}
    </View>
  );
}
