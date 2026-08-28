// Horizontal row of premium cards leading Home's "All" tab — the real
// differentiator (LocalShopCard: a full-bleed hero photo of a real nearby
// store, "100% Local" badge — the one thing Instamart/Blinkit/BigBasket's
// warehouse model can't show) comes first, then 3 product-list promo cards
// reworked from Instamart's own "₹1 Store"/"Most shopped near you" row with
// real Flikk content instead of a fabricated gimmick (no ₹1-store or
// festival-sale concept exists here). "Most Bought Near You" and "Fresh
// Picks For You" both come from the real catalog feed
// (useEverydayEssentials.ts -> GET /stores/products/catalog, same query
// already cached for Today's Stock — reused here, not refetched) sliced two
// different ways so the cards don't just repeat each other; "Best Deals"
// reuses the real discounted-products feed (useDealsProducts.ts).
//
// Sits above NearbyStoresSection ("Shops Near You") on Home's "All" tab,
// per an explicit ask.

import { ScrollView, View } from 'react-native';
import { Discount01Icon, Leaf01Icon, ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';
import { useDealsProducts } from '../sections/useDealsProducts';
import { LocalShopCard } from './components/LocalShopCard';
import { PromoListCard } from './components/PromoListCard';
import { DUMMY_BEST_DEALS, DUMMY_FRESH_PICKS, DUMMY_MOST_BOUGHT } from './dummyPreviewProducts';
import type { AppStackParamList } from '../../../navigation/types';

export function MostBoughtSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: catalog = [] } = useEverydayEssentials();
  const { data: deals = [] } = useDealsProducts();

  // TEMPORARY — falls back to dummyPreviewProducts.ts only when the real
  // feed has fewer than 4 items, purely so the 4-row card layout can be
  // eyeballed right now. Real data wins the instant there's enough of it;
  // delete this fallback once admin's Inventory has a real catalog.
  const realMostBought = catalog.slice(0, 4);
  const realFreshPicks = catalog.slice(4, 8);
  const realBestDeals = deals.slice(0, 4);
  const mostBought = realMostBought.length >= 4 ? realMostBought : DUMMY_MOST_BOUGHT;
  const freshPicks = realFreshPicks.length >= 4 ? realFreshPicks : DUMMY_FRESH_PICKS;
  const bestDeals = realBestDeals.length >= 4 ? realBestDeals : DUMMY_BEST_DEALS;

  function seeAll() {
    navigation.navigate('Categories');
  }

  return (
    <View className="pt-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        <LocalShopCard />

        {mostBought.length > 0 && (
          <PromoListCard
            title="Most Bought Near You"
            icon={ShoppingBasket01Icon}
            iconBg="#DDF7E8"
            accentColor="#5A9A2E"
            gradientColors={['#EEF7DC', '#FFFFFF']}
            products={mostBought}
            onSeeAll={seeAll}
          />
        )}

        {bestDeals.length > 0 && (
          <PromoListCard
            title="Best Deals Today"
            icon={Discount01Icon}
            iconBg="#FDE8E4"
            accentColor="#D9694A"
            gradientColors={['#FFF1EC', '#FFFFFF']}
            products={bestDeals}
            onSeeAll={seeAll}
          />
        )}

        {freshPicks.length > 0 && (
          <PromoListCard
            title="Fresh Picks For You"
            icon={Leaf01Icon}
            iconBg="#E3F0FF"
            accentColor="#3E7DC9"
            gradientColors={['#EAF3FF', '#FFFFFF']}
            products={freshPicks}
            onSeeAll={seeAll}
          />
        )}
      </ScrollView>
    </View>
  );
}
