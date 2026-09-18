// Everything shown on the "All" category tab, below the header, in this
// agreed order (personalized-to-you first, then browse/social-proof, then
// deals/urgency, then long-tail filler, footer last):
//
//   1. Seasonal + Festival panel (hero, brand/timely — currently hidden)
//   2. Spotlight (header bleed) — 3 real cards, auto-advancing + draggable, background blended into the header's own bg (own note below)
//   3. Quick Category Strip  — flat row, real categories (own note below)
//   4. Buy It Again          — personalized, real order history
//   5. Nearby Stores
//   6. Most Bought
//   7. Trending This Week    — momentum (TEMPORARY data source, see its own note)
//   8. Category Sections
//   9. Top Rated Stores Near You — trust signal, right before Deals
//  10. Deals Section
//  11. Today's Steal Deals
//  12. Everyday Essentials
//  13. New on Flikk          — discovery-only, least urgent
//  14. Brand footer
//
// Only rendered when "all" is selected — see HomeScreen.tsx.
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
// it used to be. Top Rated Stores/New on Flikk are zone-wide, not
// nearest-store-scoped (they're both re-sorts of useAllStores' own GET
// /stores, which already scopes to the one active zone — CLAUDE.md,
// single zone at launch), so they render outside the isServiceable branch
// below, same as CategorySections/DealsSection.
//
// CoastalKitchenPicksSection is gone entirely — per an explicit ask to
// strip every product-card dummy dataset out of the app
// (COASTAL_KITCHEN_PICKS_PRODUCTS was fully fabricated, shown
// unconditionally).

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../../components/BrandFooter';
import { BuyItAgainSection } from '../buy-it-again/BuyItAgainSection';
import { DealsSection } from '../deals/DealsSection';
import { TodaysOfferSection } from '../deals/TodaysOfferSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
// import { FestivalPicksSection } from '../festival-picks/FestivalPicksSection';
import { MostBoughtSection } from '../most-bought/MostBoughtSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { NewOnFlikkSection } from '../new-on-flikk/NewOnFlikkSection';
import { ProductSection } from '../products/ProductSection';
import { QuickCategoryStrip } from '../quick-categories/QuickCategoryStrip';
// import { SeasonalSection } from '../seasonal/SeasonalSection';
import { SpotlightHeaderBleed } from '../spotlight/SpotlightHeaderBleed';
// import { StoreTypesSection } from '../store-types/StoreTypesSection';
// import { gradientForTabName } from '../data/categoryHeaderGradients';
import { TopRatedStoresSection } from '../top-rated-stores/TopRatedStoresSection';
import { TrendingSection } from '../trending/TrendingSection';
import { useNearestStore } from '../useNearestStore';
import { useDealsProducts } from './useDealsProducts';

interface Props {
  // Passed straight through to QuickCategoryStrip — same setSelectedCategoryId
  // HomeHeader's own CategoryTabs already drives, so tapping a tile here
  // switches Home's real tab body, it doesn't open a second navigation stack.
  onSelectCategory: (id: string) => void;
}

export function AllTabSections({ onSelectCategory }: Props) {
  // Resolved once here, not inside useDealsProducts itself — every
  // store-scoped section on this screen (just this one for now, see this
  // file's own header note) reads the SAME resolved store, so they can't
  // end up disagreeing about which store an order here would go to.
  // HomeScreen.tsx renders UnavailableZoneScreen instead of this whole
  // component when isServiceable is false — this only ever mounts in the
  // serviceable case, so storeId here is always a real nearby store.
  const { storeId } = useNearestStore();
  const { data: dealsProducts = [] } = useDealsProducts(storeId);
  // Only needed by the hidden Seasonal+Festival panel below.
  // const panelGradient = gradientForTabName('all');

  return (
    // pb-32 — same floating-CartBar clearance fix applied across every
    // tab body (Groceries/Bakery/Fish/Protein/Regional/generic tile
    // grid); "All" ends on CategoriesFooter, which needs the same
    // breathing room from BottomNavBar + CartBar as every other tab's
    // last row.
    <View className="pb-32">
      {/* One shared panel — SeasonalSection's own banner/tiles and
              FestivalPicksSection's product row read as one continuous
              section (same background, one rounded bottom edge), per an
              explicit ask, rather than two separately-backed blocks stacked
              on top of each other. That background is HomeHeader's own
              'all' gradient (LinearGradient, not a flat color) per a later
              ask that the header and this panel read as the exact same
              background rather than two different treatments. */}
          {/* <LinearGradient colors={panelGradient.colors} locations={panelGradient.stops} className="overflow-hidden rounded-b-[32px]">
            <SeasonalSection />
            <FestivalPicksSection />
          </LinearGradient> */}
          {/* Directly below Seasonal, per an explicit ask — kept OUTSIDE
              the LinearGradient panel above rather than spliced between
              SeasonalSection and FestivalPicksSection, since that panel's
              whole point (its own note above) is those two reading as one
              continuous background; this card has its own distinct green
              gradient and would break that. Still the very next thing on
              screen after Seasonal/Festival either way. */}
          {/* SpotlightHeaderBleed = SpotlightCarousel (3 real cards,
              auto-advancing + still draggable) plus the background layer
              that extends the header's own gradient down behind them,
              fading to white (HeaderBackgroundGradient — the same one
              file HomeHeader.tsx's own background renders through). See
              that file's own note for the full logic. Sits right below
              the header. */}
          {/* Todays offer — static (no auto-advance), 4 real deal products,
              same dealsProducts feed as Today's Steal Deals further down.
              Sits above the spotlight per an explicit ask/reference sketch. */}
          <TodaysOfferSection products={dealsProducts} />
          <SpotlightHeaderBleed />
          {/* Same real tabs (useHomeTabs) HomeHeader's own top CategoryTabs
              row reads, minus "All" — tapping one switches that same top
              tab bar's selection (onSelectCategory, threaded down from
              HomeScreen), not a separate CategoryDetail screen. */}
          {/* <QuickCategoryStrip onSelectCategory={onSelectCategory} /> */}
          {/* Personalized-to-you first, before general browse/discovery
              rows further down (agreed Home section order) — real repeat-
              purchase data, off entirely for a guest or a customer with no
              delivered order yet (BuyItAgainSection's own note). */}
          <BuyItAgainSection />
          <NearbyStoresSection />
          {/* <MostBoughtSection /> */}
          {/* Momentum signal, right after MostBought — see that section's
              own note on why its data source is temporary. */}
          {/* <TrendingSection /> */}
      {/* <StoreTypesSection /> */}
      <CategorySections />
      {/* Trust signal, right before DealsSection — reassurance ->
          purchase nudge, per the agreed Home section order. */}
      <TopRatedStoresSection />
      <DealsSection />
      {dealsProducts.length > 0 && (
        <ProductSection title="Today's Steal Deals" products={dealsProducts} showDiscountBadge />
      )}
      <EverydayEssentialsSection />
      {/* Discovery-only, least urgent — near the very end, right before
          the footer. */}
      <NewOnFlikkSection />
      <BrandFooter />
    </View>
  );
}
