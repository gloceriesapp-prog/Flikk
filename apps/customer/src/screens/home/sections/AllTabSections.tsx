// Everything shown on the "All" category tab, below the header:
// SeasonalSection (reskinned per festival, self-hides once its mock data
// list is empty — see that file's own note), MostBoughtSection (3 premium
// promo cards, real product data), nearby
// shops, everyday essentials, the deals promo card, the full category grid
// (CategorySections — shared with screens/categories/CategoriesScreen.tsx,
// see that component's own note), Coastal Kitchen picks, Today's Steal
// Deals — real, currently-discounted products from the backend
// (useDealsProducts.ts), not a static mock — then the same brand sign-off
// footer CategoriesScreen ends on (CategoriesFooter — generic branding, not
// category-specific, so it's reused as-is rather than copied). Bestsellers
// was dropped — Steal Deals absorbed it (3-column grid) rather than keeping
// two overlapping "cheap stuff" rows. Only rendered when "all" is selected
// — see HomeScreen.tsx.

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { CategoriesFooter } from '../../categories/CategoriesFooter';
import { CoastalKitchenPicksSection } from '../coastal-kitchen-picks/CoastalKitchenPicksSection';
import { DealsSection } from '../deals/DealsSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { MostBoughtSection } from '../most-bought/MostBoughtSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { ProductSection } from '../products/ProductSection';
import { SeasonalSection } from '../seasonal/SeasonalSection';
import { StoreTypesSection } from '../store-types/StoreTypesSection';
import { useDealsProducts } from './useDealsProducts';

export function AllTabSections() {
  const { data: dealsProducts = [] } = useDealsProducts();

  return (
    // pb-32 — same floating-CartBar clearance fix applied across every
    // tab body (Groceries/Bakery/Fish/Protein/Regional/generic tile
    // grid); "All" ends on CategoriesFooter, which needs the same
    // breathing room from BottomNavBar + CartBar as every other tab's
    // last row.
    <View className="pb-32">
      <SeasonalSection />
      {/* <MostBoughtSection /> */}
      {/* <NearbyStoresSection /> */}
      <StoreTypesSection />
      <CategorySections />
      {/* <EverydayEssentialsSection /> */}
      <DealsSection />
      <CoastalKitchenPicksSection />
      {dealsProducts.length > 0 && (
        <ProductSection title="Today's Steal Deals" products={dealsProducts} showDiscountBadge />
      )}
      <CategoriesFooter />
    </View>
  );
}
