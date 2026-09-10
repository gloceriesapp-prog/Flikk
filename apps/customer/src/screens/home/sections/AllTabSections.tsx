// Everything shown on the "All" category tab, below the header:
// SeasonalSection, nearby shops, the category grid (CategorySections —
// shared with screens/categories/CategoriesScreen.tsx), the deals promo
// card, Coastal Kitchen picks, Today's Steal Deals, then the same brand
// sign-off footer CategoriesScreen ends on. Only rendered when "all" is
// selected — see HomeScreen.tsx.
//
// Closed-hours (10:30 PM–6:00 AM IST, utils/operatingHours.ts) is
// communicated entirely in the header now (HomeHeader's red gradient +
// LocationSelector's "Closed for now"/"Opens 6:00 AM tomorrow" text) — the
// ClosedForNightBanner this file used to prepend above SeasonalSection was
// removed as redundant once the header already said the same thing. This
// screen no longer needs to know the open/closed state at all.
//
// Store-scoping: useNearestStore resolves "my nearest store" ONCE here and
// Today's Steal Deals (useDealsProducts) queries that one store's own
// catalog — real inventory with real checkout consequences (single-store-
// per-order, CLAUDE.md), not pooled across every partnered store the way
// it used to be. Every OTHER section rendered here (SeasonalSection,
// StoreTypesSection, CategorySections, DealsSection's own promo card,
// CoastalKitchenPicksSection) is static mock/demo content with no real
// per-store inventory behind it yet — MostBoughtSection and
// EverydayEssentialsSection are commented out below for the same reason.
// Scoping those to a store would mean fabricating which store "owns" a
// hardcoded product list; that's a content problem (real products need to
// exist per store first), not something to paper over here.

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../../components/BrandFooter';
import { CoastalKitchenPicksSection } from '../coastal-kitchen-picks/CoastalKitchenPicksSection';
import { DealsSection } from '../deals/DealsSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { MostBoughtSection } from '../most-bought/MostBoughtSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { ProductSection } from '../products/ProductSection';
import { SeasonalSection } from '../seasonal/SeasonalSection';
import { StoreTypesSection } from '../store-types/StoreTypesSection';
import { useNearestStore } from '../useNearestStore';
import { useDealsProducts } from './useDealsProducts';

export function AllTabSections() {
  // Resolved once here, not inside useDealsProducts itself — every
  // store-scoped section on this screen (just this one for now, see this
  // file's own header note) reads the SAME resolved store, so they can't
  // end up disagreeing about which store an order here would go to.
  const { storeId } = useNearestStore();
  const { data: dealsProducts = [] } = useDealsProducts(storeId);

  return (
    // pb-32 — same floating-CartBar clearance fix applied across every
    // tab body (Groceries/Bakery/Fish/Protein/Regional/generic tile
    // grid); "All" ends on CategoriesFooter, which needs the same
    // breathing room from BottomNavBar + CartBar as every other tab's
    // last row.
    <View className="pb-32">
      <SeasonalSection />
      {/* <MostBoughtSection /> */}
      <NearbyStoresSection />
      <StoreTypesSection />
      <CategorySections />
      {/* <EverydayEssentialsSection /> */}
      <DealsSection />
      <CoastalKitchenPicksSection />
      {dealsProducts.length > 0 && (
        <ProductSection title="Today's Steal Deals" products={dealsProducts} showDiscountBadge />
      )}
      <BrandFooter />
    </View>
  );
}
