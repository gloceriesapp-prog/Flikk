// Icon per store category (apps/admin/src/lib/store-options.ts's own
// STORE_CATEGORIES — the fixed list a founder picks from when onboarding a
// store, same list apps/partner's Store Settings uses). Any category not
// in this map (a founder picks "Others", or a future category gets added
// to STORE_CATEGORIES before this map catches up) falls back to a generic
// storefront icon rather than breaking.

import {
  Bread01Icon,
  CarrotIcon,
  HammerIcon,
  Medicine01Icon,
  PaintBucketIcon,
  Pot01Icon,
  ShoppingCart01Icon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

const ICON_BY_CATEGORY: Record<string, IconSvgElement> = {
  'kirana & grocery': ShoppingCart01Icon,
  supermarket: Store01Icon,
  pharmacy: Medicine01Icon,
  bakery: Bread01Icon,
  'fruits & vegetables': CarrotIcon,
  hardware: HammerIcon,
  'paint shop': PaintBucketIcon,
  'steel & vessels': Pot01Icon,
  'general store': Store01Icon,
};

export function iconForStoreCategory(category: string): IconSvgElement {
  return ICON_BY_CATEGORY[category.trim().toLowerCase()] ?? Store01Icon;
}
