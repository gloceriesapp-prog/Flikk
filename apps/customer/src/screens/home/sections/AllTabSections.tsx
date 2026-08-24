// Everything shown on the "All" category tab, below the header: nearby
// shops, everyday essentials, the deals promo card, the full category grid
// (CategorySections — shared with screens/categories/CategoriesScreen.tsx,
// see that component's own note), Coastal Kitchen picks, then Today's Steal
// Deals — real, currently-discounted products from the backend
// (useDealsProducts.ts), not a static mock. Bestsellers was dropped — Steal
// Deals absorbed it (3-column grid) rather than keeping two overlapping
// "cheap stuff" rows. Only rendered when "all" is selected — see
// HomeScreen.tsx.

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { CoastalKitchenPicksSection } from '../coastal-kitchen-picks/CoastalKitchenPicksSection';
import { DealsSection } from '../deals/DealsSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { ProductSection } from '../products/ProductSection';
import { useDealsProducts } from './useDealsProducts';

export function AllTabSections() {
  const { data: dealsProducts = [] } = useDealsProducts();

  return (
    <View>
      <NearbyStoresSection />
      <EverydayEssentialsSection />
      <DealsSection />
      <CategorySections />
      <CoastalKitchenPicksSection />
      {dealsProducts.length > 0 && (
        <ProductSection title="Today's Steal Deals" products={dealsProducts} showDiscountBadge />
      )}
    </View>
  );
}
