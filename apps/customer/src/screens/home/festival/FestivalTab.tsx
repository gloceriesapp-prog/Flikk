import { Text, View } from 'react-native';
import type { RemoteHomeTab } from '../data/useHomeTabs';
import { HomeTabTileGrid } from '../hometab/HomeTabTileGrid';
import { FestivalGreetingPanel } from './greeting/FestivalGreetingPanel';
import { DISABLED_FESTIVAL_TAB } from './data';
import { PujaEssentialsSection } from './puja-essentials/PujaEssentialsSection';
import { FlowersAndGarlandsSection } from './flowers-and-garlands/FlowersAndGarlandsSection';
import { SweetsToShareSection } from './sweets-to-share/SweetsToShareSection';
import { FruitsForTheFestivalSection } from './fruits-for-the-festival/FruitsForTheFestivalSection';
import { LightUpHomeSection } from './light-up-home/LightUpHomeSection';
import { FromLocalShopsSection } from './from-local-shops/FromLocalShopsSection';
import { FestivalOffersSection } from './festival-offers/FestivalOffersSection';
import { useFestivalSection } from './picks/useFestivalSection';
import { SectionTitle } from '../components/SectionTitle';
import { GroceryProductTile } from '../groceries/components/GroceryProductTile';
import { useNearbyGroceryInventory } from '../groceries/useNearbyGroceryInventory';
import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../loading/BrowseLoadingText';

interface Props {
  tab: RemoteHomeTab;
}

// Admin-controlled festival tab (festival_greeting.tab_*, migration 112).
// Shelves are the admin Festival Section's products; the keyword-matched
// shelves (puja, flowers, sweets, fruit, lights, offers) are only the
// fallback while the admin has enabled the tab but picked no products.
export function FestivalTab({ tab }: Props) {
  const festival = tab.festival ?? DISABLED_FESTIVAL_TAB;
  const hasContent = tab.tiles.length > 0 || tab.banners.length > 0;
  const inventory = useNearbyGroceryInventory();
  const adminSection = useFestivalSection();
  const adminProducts = adminSection.data?.products ?? [];
  const usesAdminProducts = adminProducts.length > 0;
  const loading = adminSection.isPending || (!usesAdminProducts && inventory.isLoading);
  return (
    <View>
      <View style={{ backgroundColor: festival.backgroundColor }}>
        <FestivalGreetingPanel festival={festival} />
      </View>
      {loading ? <BrowseLoadingText message={BROWSE_LOADING_COPY.festival} /> : <View style={hasContent ? undefined : { paddingBottom: 128 }}>
        {usesAdminProducts ? (
          <>
            <View className="pt-8">
              <SectionTitle>{adminSection.data!.title}</SectionTitle>
              <View className="px-5">
                <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">
                  {adminProducts.map((product) => (
                    <View key={product.id} className="px-1" style={{ width: '33.333333%' }}>
                      <GroceryProductTile product={product} />
                      {product.storeName && (
                        <Text numberOfLines={1} className="mt-1.5 text-[11px] font-medium text-ink/55">{product.storeName}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <FromLocalShopsSection storeIds={adminProducts.map((product) => product.storeId).filter((id): id is string => !!id)} />
          </>
        ) : (
          <>
            <PujaEssentialsSection />
            <FlowersAndGarlandsSection />
            <SweetsToShareSection />
            <FruitsForTheFestivalSection />
            <LightUpHomeSection />
            <FromLocalShopsSection />
            <FestivalOffersSection />
          </>
        )}
      </View>}
      {hasContent && <HomeTabTileGrid tab={tab} showProducts={false} />}
    </View>
  );
}
