import { Bread01Icon, KitchenUtensilsIcon, ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface RegionalCategory {
  id: string;
  title: string;
  tint: string;
  accent: string;
  icon: IconSvgElement;
  groups: RegExp[];
}

// Names are the available catalogue taxonomy for these collections. The
// same rules feed category discovery and its listing; no origin is inferred.
export const REGIONAL_CATEGORIES: RegionalCategory[] = [
  { id: 'snacks', title: 'Local Snacks', tint: '#FFF0DD', accent: '#9B642C', icon: Bread01Icon, groups: [/\b(chips?|murukku|chakli|chakkuli|kodubale|namkeen|mixture|sev|chivda|banana wafers?|jackfruit chips|snacks?)\b/i] },
  { id: 'sweets', title: 'Sweets', tint: '#FBE8ED', accent: '#9C526B', icon: Bread01Icon, groups: [/\b(sweets?|mithai|laddoo|laddu|ladoo|barfi|burfi|halwa|mysore pak|peda|chikki|jalebi|gulab jamun|rasgulla|payasam)\b/i] },
  { id: 'pantry-staples', title: 'Pantry Staples', tint: '#F5EDD9', accent: '#8A703C', icon: ShoppingBasket01Icon, groups: [/^(?!.*\b(mix|masala|chips?|snacks?|sweets?|chikki|pickles?|juice|drinks?|laddoo|laddu|ladoo|halwa|barfi|burfi|cookies?|biscuits?|cake)\b).*\b(rice|atta|flour|dal|dhal|pulses?|lentils?|grains?|coconut oil|jaggery|salt|sugar|poha|rava|semolina)\b/i] },
  { id: 'spice-mixes', title: 'Spice Mixes', tint: '#F9E7D9', accent: '#9E5734', icon: KitchenUtensilsIcon, groups: [/^(?!.*\b(chips?|snacks?|namkeen|pickles?|juice|drinks?)\b).*\b(masala|spice mix|spice blend|sambar powder|sambhar powder|rasam powder|chutney powder|chutney pudi|chutney podi|curry powder|puliyogare mix)\b/i] },
  { id: 'drinks', title: 'Drinks', tint: '#E7F1EE', accent: '#477666', icon: ShoppingBasket01Icon, groups: [/\b(juice|drinks?|beverages?|coconut water|tender coconut|buttermilk|lassi|kokum|kashaya|sherbet|sharbat|nannari)\b/i] },
  { id: 'pickles', title: 'Pickles', tint: '#EBEEDB', accent: '#64733F', icon: KitchenUtensilsIcon, groups: [/\b(pickles?|achar|achaar|uppinakayi|thokku)\b/i] },
];

export function findRegionalCategory(categoryId: string): RegionalCategory | undefined {
  return REGIONAL_CATEGORIES.find((category) => category.id === categoryId);
}

export const REGIONAL_PRODUCT_GROUPS = REGIONAL_CATEGORIES.flatMap((category) => category.groups);
