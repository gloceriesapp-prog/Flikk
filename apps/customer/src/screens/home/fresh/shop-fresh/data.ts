import { CarrotIcon, KitchenUtensilsIcon, ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface FreshCategory {
  id: string;
  title: string;
  tint: string;
  accent: string;
  icon: IconSvgElement;
  groups: RegExp[];
}

const produce = (names: string) => new RegExp(`^(?!.*\\b(powder|paste|sauce|ketchup|pickles?|chips?|juice|biscuits?|cookies?|bread|cake|oil|dried|dehydrated|seeds?)\\b).*\\b(${names})\\b`, 'i');

export const FRESH_CATEGORIES: FreshCategory[] = [
  { id: 'vegetables', title: 'Vegetables', tint: '#EEF4E5', accent: '#526A36', icon: CarrotIcon, groups: [produce('onions?|tomatoes?|potatoes?|brinjal|eggplant|carrots?|beans|peas|cauliflower|cabbage|capsicum|okra|bhindi|gourds?|beetroot')] },
  { id: 'fruits', title: 'Fruits', tint: '#FFF2DD', accent: '#996021', icon: ShoppingBasket01Icon, groups: [produce('bananas?|apples?|oranges?|mangoes?|grapes?|papaya|pineapple|watermelon|pomegranate|guava|pears?|lemons?|limes?')] },
  { id: 'leafy-greens', title: 'Leafy Greens', tint: '#E7F1E7', accent: '#407039', icon: CarrotIcon, groups: [produce('spinach|palak|lettuce|amaranth|methi|fenugreek leaves|leafy greens|soppu')] },
  { id: 'herbs', title: 'Herbs', tint: '#E9F3EE', accent: '#497860', icon: CarrotIcon, groups: [produce('coriander|cilantro|mint|pudina|curry leaves|basil|parsley|dill|rosemary|thyme')] },
  { id: 'exotic-produce', title: 'Exotic Produce', tint: '#F0EBF7', accent: '#68549A', icon: ShoppingBasket01Icon, groups: [produce('broccoli|zucchini|avocado|asparagus|cherry tomatoes|bell peppers|dragon fruit|kiwi|blueberries|strawberries|mushrooms?')] },
  { id: 'fresh-cuts', title: 'Fresh Cuts', tint: '#F8EAE0', accent: '#9B593D', icon: KitchenUtensilsIcon, groups: [/^(?!.*\b(meat|chicken|fish|mutton|beef|pork|chips|bread|cake)\b)(?=.*\b(cut|cuts|chopped|peeled|sliced|diced)\b).*\b(fruit|vegetables?|onions?|carrots?|pumpkin|coconut|pineapple|papaya|watermelon|beans|beetroot|potatoes?)\b/i] },
];
