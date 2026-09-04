// Home's top tab row. "All" is the one permanently hardcoded tab (it isn't
// a real category, it's "show everything" — nothing to manage in admin).
// Every other tab is real data an admin adds from the Home Categories
// screen (apps/admin/src/app/(dashboard)/home-categories) via GET
// /home-tabs — see useHomeTabs.ts. Removing/renaming a tab in admin removes
// it here too, no code change needed.

import {
  Bread01Icon,
  CarrotIcon,
  FishIcon,
  KitchenUtensilsIcon,
  Location05Icon,
  ShoppingBasket01Icon,
  ShoppingCart01Icon,
  Store03Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface Category {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export const ALL_TAB: Category = { id: 'all', label: 'All', icon: ShoppingBasket01Icon };

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
