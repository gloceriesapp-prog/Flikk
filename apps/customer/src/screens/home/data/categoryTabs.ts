// Home's top tab row. All is permanent; admin tabs come from /home-tabs.
// Home labels are customised without renaming the underlying records.
// Parts & Tools is also shown locally until its admin tab is configured.

import {
  Bread01Icon,
  CarrotIcon,
  FishIcon,
  KitchenUtensilsIcon,
  ShoppingBasket01Icon,
  ShoppingCart01Icon,
  Store03Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import type { RemoteHomeTab } from './useHomeTabs';
import { isFestivalTabName, NAVRATRI_FESTIVAL, withFestivalHomeTab } from '../festival/data';

export interface Category {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export const ALL_TAB: Category = { id: 'all', label: 'All', icon: ShoppingBasket01Icon };

// Tab labels are the admin's own home_tabs.name (Home Categories screen) —
// no hardcoded renames here, so what admin types is what customers see.
export function homeTabLabel(name: string): string {
  if (isFestivalTabName(name)) return NAVRATRI_FESTIVAL.name;
  return name;
}

// Dairy now lives in the All feed. Keep Parts & Tools separate from any
// Dairy admin content, and prefer its real tab when configured.
const PARTS_AND_TOOLS_HOME_TAB: RemoteHomeTab = { id: 'home-header-parts-tools', name: 'Parts & Tools', tiles: [], banners: [] };

export function withHomeCategoryTabs(tabs: RemoteHomeTab[]): RemoteHomeTab[] {
  const homeTabs = tabs.filter((tab) => tab.contentKey || tab.name.trim().toLowerCase() !== 'dairy');
  const tabsWithTools = homeTabs.some((tab) => tab.name.trim().toLowerCase() === 'parts & tools') ? homeTabs : [...homeTabs, PARTS_AND_TOOLS_HOME_TAB];
  return withFestivalHomeTab(tabsWithTools);
}

// Real tabs carry no icon of their own (title-only by admin design — see
// home-categories/page.tsx's own note on why). A handful of well-known
// names still get their old icon for continuity; anything else falls back
// to a generic one.
const ICON_BY_TAB_NAME: Record<string, IconSvgElement> = {
  groceries: ShoppingCart01Icon,
  fresh: CarrotIcon,
  'meat & fish': FishIcon,
  bakery: Bread01Icon,
  regional: Store03Icon,
  household: KitchenUtensilsIcon,
};

export function iconForTabName(name: string): IconSvgElement {
  return ICON_BY_TAB_NAME[name.trim().toLowerCase()] ?? ShoppingBasket01Icon;
}

// Header tabs and in-feed shortcuts must share IDs, labels, icons and
// visibility, including admin-managed categories and festival fallbacks.
export function buildHomeCategories(tabs: RemoteHomeTab[]): Category[] {
  return [ALL_TAB, ...withHomeCategoryTabs(tabs).map((tab) => ({
    id: tab.id,
    label: tab.label ?? homeTabLabel(tab.name),
    icon: iconForTabName(tab.contentKey === 'grocery' ? 'groceries' : tab.contentKey ?? tab.name),
  }))];
}
