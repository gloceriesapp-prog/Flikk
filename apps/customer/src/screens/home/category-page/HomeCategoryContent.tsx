import type { RemoteHomeTab } from '../data/useHomeTabs';
import { BakeryFreshnessBanner } from '../bakery/BakeryFreshnessBanner';
import { GroceriesTab } from '../groceries/GroceriesTab';
import { FreshTab } from '../fresh/FreshTab';
import { RegionalTab } from '../regional/RegionalTab';
import { FestivalTab } from '../festival/FestivalTab';
import { HomeTabTileGrid } from '../hometab/HomeTabTileGrid';

// Resolve by managed identity first, so admin display-name changes cannot
// send Grocery/Fresh/Regional to a different template.
export function homeCategoryKind(tab: RemoteHomeTab) {
  if (tab.contentKey) return tab.contentKey === 'grocery' ? 'groceries' : tab.contentKey;
  if (tab.festival) return 'festival';
  const names: Record<string, string> = {
    grocery: 'groceries', groceries: 'groceries', fresh: 'fresh',
    'fruit & veg': 'fresh', 'meat & fish': 'meat-fish', 'fish & meat': 'meat-fish',
    bakery: 'bakery', bakeries: 'bakery', protein: 'protein', regional: 'regional',
  };
  return names[tab.name.trim().toLowerCase()];
}

export function homeCategoryHeaderName(tab: RemoteHomeTab): string {
  return tab.contentKey === 'grocery' ? 'groceries' : tab.contentKey ?? tab.name;
}

// The dedicated page mounts the original components rather than copies.
// Changes to their sections, product logic or admin data apply everywhere.
export function HomeCategoryContent({ tab }: { tab: RemoteHomeTab }) {
  switch (homeCategoryKind(tab)) {
    case 'groceries': return <GroceriesTab />;
    case 'fresh': return <FreshTab />;
    // Bakery/Protein/Meat & Fish: admin tiles + real category browse.
    case 'bakery': return <><BakeryFreshnessBanner /><HomeTabTileGrid tab={tab} /></>;
    case 'regional': return <RegionalTab />;
    case 'festival': return <FestivalTab tab={tab} />;
    default: return <HomeTabTileGrid tab={tab} />;
  }
}
