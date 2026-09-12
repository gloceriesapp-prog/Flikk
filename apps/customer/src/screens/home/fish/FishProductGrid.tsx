// This tab's own promo poster — real admin data (Home Categories ->
// "Meat & Fish" tab's own "Ads & posters" section), image only, renders
// only when a founder has actually added one, same convention as
// GroceriesTab/BakeryTab/ProteinTab.
//
// The "Fresh meat and fish, every day." product grid (FISH_PRODUCTS) is
// gone — per an explicit ask to strip every product-card dummy dataset
// out of the app. No real Meat & Fish-scoped catalog feed exists yet;
// re-add once one does, not with fabricated data in the meantime.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function FishProductGrid({ banner }: Props) {
  return (
    // pb-32 — the floating CartBar ("Unlock FREE Delivery"/"View cart")
    // stacks on top of BottomNavBar once the cart has items, and without
    // real clearance here it covers this tab's own last product row (same
    // fix applied across every tab body: Groceries/Bakery/Protein/
    // Regional/generic tile grid).
    <View className="pb-32">{banner && <PosterBanner imageUri={banner.imageUrl} />}</View>
  );
}
