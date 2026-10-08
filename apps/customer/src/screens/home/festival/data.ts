import type { RemoteHomeTab } from '../data/useHomeTabs';
import { storageUrl } from '../../../utils/storageUrl';

// The festival tab is admin-controlled (festival_greeting.tab_*, migration
// 112; admin's Festival Greeting page) and served by GET
// /home/festival-greeting. It is OFF unless the admin switches it on: no
// config, a failed fetch or an older backend means no festival tab.
export interface FestivalTabConfig {
  enabled: boolean;
  title: string;
  backgroundColor: string;
  headerColor: string;
  headerImageUri: string | null;
  bannerImageUri: string | null;
}

export const FESTIVAL_TAB_ID = 'home-festival';

// Banner artwork proportions (the original Navratri banner, 2116x743).
export const FESTIVAL_BANNER_ASPECT_RATIO = 2116 / 743;

export const DISABLED_FESTIVAL_TAB: FestivalTabConfig = {
  enabled: false,
  title: 'Navratri',
  backgroundColor: '#FFF1D6',
  headerColor: '#F6C667',
  headerImageUri: null,
  bannerImageUri: null,
};

const HEX = /^#[0-9a-f]{6}$/i;

// Storage paths resolve to public media URLs; only https URLs are kept.
export function festivalArtworkUri(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return storageUrl(trimmed);
}

export function mapFestivalTabConfig(tab: unknown): FestivalTabConfig {
  if (!tab || typeof tab !== 'object') return DISABLED_FESTIVAL_TAB;
  const t = tab as Record<string, unknown>;
  return {
    enabled: t.enabled === true,
    title: typeof t.title === 'string' && t.title.trim() ? t.title.trim() : DISABLED_FESTIVAL_TAB.title,
    backgroundColor: typeof t.backgroundColor === 'string' && HEX.test(t.backgroundColor) ? t.backgroundColor : DISABLED_FESTIVAL_TAB.backgroundColor,
    headerColor: typeof t.headerColor === 'string' && HEX.test(t.headerColor) ? t.headerColor : DISABLED_FESTIVAL_TAB.headerColor,
    headerImageUri: festivalArtworkUri(t.headerImageUrl),
    bannerImageUri: festivalArtworkUri(t.bannerImageUrl),
  };
}

const LEGACY_FESTIVAL_NAMES = ['navratri', 'navartri', 'navaratri'];

// An admin Home Categories tab named like the festival (or a legacy Navratri
// tab) is the festival tab's own tiles/posters, not a separate tab.
export function isFestivalTabName(name: string, config: Pick<FestivalTabConfig, 'title'> = DISABLED_FESTIVAL_TAB): boolean {
  const normalized = name.trim().toLowerCase();
  return LEGACY_FESTIVAL_NAMES.includes(normalized) || normalized === config.title.trim().toLowerCase();
}

// Disabled: every festival-named tab is hidden. Enabled: the matching admin
// tab (its ID, tiles and banners kept) or a synthesized one goes first,
// marked with its config and labelled with the admin tab title.
export function withFestivalHomeTab(tabs: RemoteHomeTab[], config: FestivalTabConfig): RemoteHomeTab[] {
  const isFestival = (tab: RemoteHomeTab) => !tab.contentKey && isFestivalTabName(tab.name, config);
  const otherTabs = tabs.filter((tab) => !isFestival(tab));
  if (!config.enabled) return otherTabs;
  const configuredTab = tabs.find(isFestival);
  const festivalTab: RemoteHomeTab = {
    ...(configuredTab ?? { id: FESTIVAL_TAB_ID, name: config.title, tiles: [], banners: [] }),
    label: config.title,
    festival: config,
  };
  return [festivalTab, ...otherTabs];
}
