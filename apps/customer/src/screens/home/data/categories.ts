// Placeholder category data. Real categories should come from `products.category`
// per store (specs/00-foundation/data-model.md) once Home actually browses stores —
// that's PRD screens C4/C5, not built yet. This list only exists so the top-of-Home
// UI has something real to render.

import {
  Bread01Icon,
  FishIcon,
  Package01Icon,
  SailboatCoastalIcon,
  ShoppingBasket01Icon,
  ShoppingCart01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface Category {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export const HOME_CATEGORIES: Category[] = [
  { id: 'all', label: 'All', icon: ShoppingBasket01Icon },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart01Icon },
  { id: 'fresh-fish', label: 'Meat & Fish', icon: FishIcon },
  { id: 'bakery', label: 'Bakery', icon: Bread01Icon },
  { id: 'essentials', label: 'Essentials', icon: Package01Icon },
  { id: 'coastal', label: 'Coastal', icon: SailboatCoastalIcon },
];
