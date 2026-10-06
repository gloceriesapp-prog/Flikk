// Search screen's pre-search state — shown while the query is empty/too
// short (SearchScreen.tsx's own MIN_QUERY_LENGTH gate), replacing what
// used to be a single centered placeholder line with real content to
// browse instead of a dead screen. Three rows, each reusing an existing
// component as-is rather than inventing new ones:
//   1. "Recommended for you" — PromoListCard (home/products/), same
//      title+horizontal-scroll shell MostBoughtSection/TrendingSection
//      already use.
//   2. "Shop by Category" — StoreTypesSection (home/store-types/), the
//      exact same real chip row Home's "All" tab and CategoriesScreen
//      already render (useStoreTypes.ts -> GET /stores, grouped by real
//      store category — Hardware, Paint Shop, etc. — plus a Wishlist
//      shortcut chip). Dropped in as-is, no wrapping heading of our own:
//      it already renders its own "Shop by Store Type" title/spacing, same
//      as how MostBoughtSection/TrendingSection below need no external
//      title either. CategoryTabs (Home header's own product-frequency
//      icon row) was tried here first and replaced per an explicit ask —
//      this store-type browse is the actual "shop by category" UI meant.
//   3. A fixed 9-card, 3-column grid (ProductCard, same w-[31%] pattern
//      EverydayEssentialsSection's "Today's Stock" uses on Home).
//
// Both product rows are TEMPORARY data sources — real catalog products
// (GET /stores/products/catalog via useEverydayEssentials), sliced into
// two non-overlapping windows so the same product never shows up twice on
// this screen, but not an actual personalized-recommendation or
// popularity ranking. Same "structure now, real ranking later" caveat
// TrendingSection.tsx already documents for its own row.

import { Text, View } from 'react-native';
import { StoreTypesSection } from '../../home/store-types/StoreTypesSection';
import { ProductCard } from '../../home/products/ProductCard';
import { PromoListCard } from '../../home/products/PromoListCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';

const RECOMMENDED_LIMIT = 6;
const GRID_LIMIT = 9;
const GRID_CARD_WIDTH = 'w-[31%]';

export function SearchSuggestions() {
  const { data: products = [] } = useEverydayEssentials();

  const recommended = products.slice(0, RECOMMENDED_LIMIT);
  const gridProducts = products.slice(RECOMMENDED_LIMIT, RECOMMENDED_LIMIT + GRID_LIMIT);

  return (
    <View className="pb-10 pt-2">
      {recommended.length > 0 && (
        <View className="pt-4">
          <PromoListCard title="Available near you" products={recommended} />
        </View>
      )}

      <StoreTypesSection />

      {gridProducts.length > 0 && (
        <View className="pt-8">
          <Text className="mb-4 px-5 text-lg font-bold text-ink">More to explore</Text>
          <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
            {gridProducts.map((product) => (
              <ProductCard key={product.id} product={product} widthClassName={GRID_CARD_WIDTH} showDiscountBadge />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
