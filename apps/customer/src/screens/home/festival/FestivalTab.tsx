import { View } from 'react-native';
import type { RemoteHomeTab } from '../data/useHomeTabs';
import { HomeTabTileGrid } from '../hometab/HomeTabTileGrid';
import { ManagedHomeTab } from '../content/ManagedHomeTab';
import { FestivalGreetingPanel } from './greeting/FestivalGreetingPanel';

// Both managed Festivals and legacy seasonal destinations use published
// sections. Curating the shared product rail must not replace every shelf.
export function FestivalTab({ tab }: { tab: RemoteHomeTab }) {
  const festival = tab.festival;
  const hasExtras = tab.tiles.length > 0 || tab.banners.length > 0;
  return <View>
    {festival?.enabled ? <View style={{ backgroundColor: festival.backgroundColor }}>
      <FestivalGreetingPanel festival={festival} />
    </View> : null}
    <ManagedHomeTab tabKey="festivals" />
    {hasExtras ? <HomeTabTileGrid tab={tab} showProducts={false} /> : null}
  </View>;
}
