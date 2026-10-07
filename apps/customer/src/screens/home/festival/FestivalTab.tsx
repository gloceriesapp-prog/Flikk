import { View } from 'react-native';
import type { RemoteHomeTab } from '../data/useHomeTabs';
import { HomeTabTileGrid } from '../hometab/HomeTabTileGrid';
import { FestivalGreetingPanel } from './greeting/FestivalGreetingPanel';
import { NAVRATRI_FESTIVAL } from './data';
import { PujaEssentialsSection } from './puja-essentials/PujaEssentialsSection';
import { FlowersAndGarlandsSection } from './flowers-and-garlands/FlowersAndGarlandsSection';
import { SweetsToShareSection } from './sweets-to-share/SweetsToShareSection';
import { FruitsForTheFestivalSection } from './fruits-for-the-festival/FruitsForTheFestivalSection';
import { LightUpHomeSection } from './light-up-home/LightUpHomeSection';
import { FromLocalShopsSection } from './from-local-shops/FromLocalShopsSection';
import { FestivalOffersSection } from './festival-offers/FestivalOffersSection';
import { useNearbyGroceryInventory } from '../groceries/useNearbyGroceryInventory';
import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../loading/BrowseLoadingText';

interface Props {
  tab: RemoteHomeTab;
}

export function FestivalTab({ tab }: Props) {
  const hasContent = tab.tiles.length > 0 || tab.banners.length > 0;
  const inventory = useNearbyGroceryInventory();
  return (
    <View>
      <View style={{ backgroundColor: NAVRATRI_FESTIVAL.backgroundColor }}>
        <FestivalGreetingPanel />
      </View>
      {inventory.isLoading ? <BrowseLoadingText message={BROWSE_LOADING_COPY.festival} /> : <View style={hasContent ? undefined : { paddingBottom: 128 }}>
        <PujaEssentialsSection />
        <FlowersAndGarlandsSection />
        <SweetsToShareSection />
        <FruitsForTheFestivalSection />
        <LightUpHomeSection />
        <FromLocalShopsSection />
        <FestivalOffersSection />
      </View>}
      {hasContent && <HomeTabTileGrid tab={tab} showProducts={false} />}
    </View>
  );
}
