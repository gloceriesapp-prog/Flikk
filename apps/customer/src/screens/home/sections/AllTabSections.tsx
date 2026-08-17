// Everything shown on the "All" category tab, below the header: nearby
// shops, everyday essentials, the deals promo card, Coastal Kitchen picks,
// then Today's Steal Deals. Bestsellers was dropped — Steal Deals absorbed
// it (9 products, 3-column grid) rather than keeping two overlapping
// "cheap stuff" rows. Only rendered when "all" is selected — see
// HomeScreen.tsx.

import { View } from 'react-native';
import { CoastalKitchenPicksSection } from '../coastal-kitchen-picks/CoastalKitchenPicksSection';
import { DealsSection } from '../deals/DealsSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { ProductSection } from '../products/ProductSection';
import { STEAL_DEALS_PRODUCTS } from './data';

export function AllTabSections() {
  return (
    <View>
      <NearbyStoresSection />
      <EverydayEssentialsSection />
      <DealsSection />
      <CoastalKitchenPicksSection />
      <ProductSection title="Today's Steal Deals" products={STEAL_DEALS_PRODUCTS} />
    </View>
  );
}
