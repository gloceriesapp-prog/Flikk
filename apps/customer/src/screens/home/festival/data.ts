import type { RemoteHomeTab } from '../data/useHomeTabs';

// Explicit visibility keeps this tab independent of the All-tab greeting.
// Dates and automatic expiry can be configured when a campaign is scheduled.
export const NAVRATRI_FESTIVAL = {
  id: 'home-festival-navratri',
  name: 'Navratri',
  title: 'Navratri Essentials',
  backgroundColor: '#FFF1D6',
  headerArtworkUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/Transparent%20Navratri%20Puja%20Arrangement.png',
  bannerArtwork: {
    uri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/navbg.png',
    width: 2116,
    height: 743,
  },
  enabled: true,
} as const;

export function isFestivalTabName(name: string): boolean {
  return ['navratri', 'navartri', 'navaratri'].includes(name.trim().toLowerCase());
}

export function withFestivalHomeTab(tabs: RemoteHomeTab[]): RemoteHomeTab[] {
  const configuredTab = tabs.find((tab) => !tab.contentKey && isFestivalTabName(tab.name));
  const otherTabs = tabs.filter((tab) => tab.contentKey || !isFestivalTabName(tab.name));
  if (!NAVRATRI_FESTIVAL.enabled) return otherTabs;
  // Preserve the admin ID, tiles and banners when available; no duplicate tab.
  const festivalTab = configuredTab ?? {
    id: NAVRATRI_FESTIVAL.id,
    name: NAVRATRI_FESTIVAL.name,
    tiles: [],
    banners: [],
  };
  return [festivalTab, ...otherTabs];
}
