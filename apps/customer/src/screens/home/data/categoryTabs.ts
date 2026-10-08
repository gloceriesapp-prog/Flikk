// Home's top tab row. All is permanent; every other tab comes from admin
// data (/home-tabs + Home Tab Content). The app injects and hides nothing:
// a tab exists exactly when admin has it active.

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

export interface Category {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export const ALL_TAB: Category = { id: 'all', label: 'All', icon: ShoppingBasket01Icon };

// Tab labels are the admin's own home_tabs.name (Home Categories screen) —
// no hardcoded renames here, so what admin types is what customers see.
// The festival tab carries the admin tab title as its label (festival/data.ts).
export function homeTabLabel(name: string): string {
  return name;
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
  return [ALL_TAB, ...tabs.map((tab) => ({
    id: tab.id,
    label: tab.label ?? homeTabLabel(tab.name),
    icon: iconForTabName(tab.contentKey === 'grocery' ? 'groceries' : tab.contentKey ?? tab.name),
  }))];
}
