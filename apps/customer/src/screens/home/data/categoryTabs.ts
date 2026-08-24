// Placeholder category data. Real categories should come from `products.category`
// per store (specs/00-foundation/data-model.md) once Home actually browses stores —
// that's PRD screens C4/C5, not built yet. This list only exists so the top-of-Home
// UI has something real to render.
//
// Renamed from categories.ts — "category tabs" is more specific than
// "categories" once this file is the one thing every Home-tab consumer
// (HomeScreen, CategoryTabs) actually imports.

import {
  Bread01Icon,
  CarrotIcon,
  EggsIcon,
  FishIcon,
  KitchenUtensilsIcon,
  ShoppingBasket01Icon,
  ShoppingCart01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface Category {
  id: string;
  label: string;
  icon: IconSvgElement;
}

// 'fresh-fish' keeps its old id (not 'meat-fish') even though the label
// changed — HomeScreen.tsx routes to FishProductGrid off this exact id, and
// there's no reason to touch that wiring just because the label did.
export const HOME_CATEGORIES: Category[] = [
  { id: 'all', label: 'All', icon: ShoppingBasket01Icon },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart01Icon },
  { id: 'fresh', label: 'Fresh', icon: CarrotIcon },
  { id: 'fresh-fish', label: 'Meat & Fish', icon: FishIcon },
  { id: 'bakery', label: 'Bakery', icon: Bread01Icon },
  { id: 'protein', label: 'Protein', icon: EggsIcon },
  { id: 'household', label: 'Household', icon: KitchenUtensilsIcon },
];
