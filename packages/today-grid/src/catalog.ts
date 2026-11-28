// Fixed facts about every grid item: its type, its data rule (read-only in
// admin) and which {placeholders} its tag may use. Everything editable lives
// in DEFAULT_ITEMS and is overridden by the published config.
import type { CardId, CardTarget, HeroId, ItemConfig, ItemId, ItemType, Placeholder } from './types.js';

export type CheckKind =
  | 'categories' | 'usuals' | 'popular' | 'offers' | 'storeOpen' | 'preorder' | 'bulk' | 'party' | 'localBrands'
  | 'fish' | 'village' | 'vegetables' | 'always';

export interface ItemFacts { type: ItemType; check: CheckKind; placeholders: Placeholder[]; rule: string }

const CATEGORY_RULE = 'needs 3+ in-stock products in its categories at nearby shops';
const cat = (type: ItemType = 'rotating'): ItemFacts => ({ type, check: 'categories', placeholders: ['min', 'pct', 'total'], rule: CATEGORY_RULE });

export const ITEM_FACTS: Record<ItemId, ItemFacts> = {
  'todays-catch': { type: 'hero', check: 'fish', placeholders: ['time', 'min'], rule: 'needs fish stock > 0 and an arrival time saved today' },
  'village-fresh': { type: 'hero', check: 'village', placeholders: ['min', 'total'], rule: 'needs village items marked picked today' },
  'veg-for-tomorrow': { type: 'hero', check: 'vegetables', placeholders: ['min', 'total'], rule: 'needs 3+ vegetables in stock' },
  'fresh-by-7': { type: 'hero', check: 'preorder', placeholders: ['cutoff', 'min'], rule: 'needs a morning pre-order slot still open' },
  'fruits-vegetables': { type: 'hero', check: 'always', placeholders: ['min', 'total'], rule: 'fallback hero, always shown' },
  'milk-breakfast': cat(), 'breakfast-ready': cat(), 'tea-coffee': cat(), 'lunch-essentials': cat(),
  'taste-of-tulunadu': cat(), 'home-cleaning': cat(), 'snack-time': cat(), 'cold-drinks': cat(),
  'fish-meat': cat(), 'ice-cream': cat(), 'daily-essentials': cat(),
  'your-usuals': { type: 'rotating', check: 'usuals', placeholders: ['total', 'min'], rule: 'needs 2+ delivered orders and 3+ repeat items in stock' },
  'popular-near-you': { type: 'rotating', check: 'popular', placeholders: ['total', 'min'], rule: 'needs 3+ top-selling in-stock items this week nearby' },
  'offers-for-you': { type: 'rotating', check: 'offers', placeholders: ['pct', 'total'], rule: 'needs a live real discount in a category the customer bought before' },
  'glo-bulk': { type: 'rotating', check: 'bulk', placeholders: ['min', 'pct', 'total'], rule: 'needs bulk products in stock' },
  'namma-brands': { type: 'rotating', check: 'localBrands', placeholders: ['total'], rule: 'needs 3+ local brands with an in-stock product at nearby open shops' },
  'tomorrow-by-7': { type: 'rotating', check: 'preorder', placeholders: ['cutoff', 'min'], rule: 'needs a morning pre-order slot still open' },
  'late-night-snacks': { type: 'rotating', check: 'storeOpen', placeholders: ['min', 'total'], rule: 'needs 1+ shop open now with items in its categories' },
  'daily-needs': { type: 'rotating', check: 'storeOpen', placeholders: ['min', 'total'], rule: 'needs 1+ shop open now with items in its categories' },
  'party-orders': { type: 'special', check: 'party', placeholders: ['min', 'total'], rule: 'needs party products enabled and in stock' },
  'festival-needs': { ...cat('special'), placeholders: ['min', 'pct', 'total', 'festival'] },
  'rainy-day': cat('special'),
};
export const HERO_IDS = Object.keys(ITEM_FACTS).filter(id => ITEM_FACTS[id as ItemId].type === 'hero') as HeroId[];
export const CARD_IDS = Object.keys(ITEM_FACTS).filter(id => ITEM_FACTS[id as ItemId].type !== 'hero') as CardId[];
export const ITEM_IDS = Object.keys(ITEM_FACTS) as ItemId[];

// Accent presets (admin colour picker) and allowed tag text colours.
export const ACCENT_PRESETS = ['#155DFC', '#1FA35C', '#E8552A', '#F2A900', '#5B21B6', '#0096C7', '#B0246A', '#0B1F4D', '#0E7C66', '#9A5B00', '#475467', '#3E6A99'];
export const TAG_TEXT_COLORS = ['#FFFFFF', '#FFD84D'] as const;

const SNACKS = ['Chips & Namkeen', 'Biscuits & Bakery', 'Sweets & Chocolates', 'Frozen Snacks'];
const STAPLES = ['Rice, Atta & Dal', 'Oils & Ghee', 'Spices & Masala', 'Pickles, Pastes & Sauces'];
const DAILY = ['Milk & Dairy Drinks', 'Rice, Atta & Dal', 'Oils & Ghee', 'Bath & Body', 'Oral Care', 'Laundry'];
const list = (categories: string[]): CardTarget => ({ type: 'categories', categories });
const W = '#FFFFFF' as const, Y = '#FFD84D' as const;

function item(title: string, line: string, tag: string, fallbackTag: string, accent: string, target: CardTarget, categories: string[] = [], tagText: '#FFFFFF' | '#FFD84D' = W): ItemConfig {
  return { enabled: true, title, line, tag, fallbackTag, accent, tagText, categories, target, images: { mode: 'auto' }, bannerUrl: null };
}
// Spec hues #F2A900 / #1FA35C / #E8552A / #0096C7 fail 4.5:1 under white tag
// text, so defaults use darker shades of the same hue (#9A6700 / #1E7A45 /
// #C2410C / #0369A1). The originals stay in the presets; saving them with a
// failing text colour is blocked by validateConfig.
// Photo slots per card type: the hero rotates up to 4 products (photo,
// price, MRP, name); every other card shows 2 photos.
export const IMAGE_SLOTS: Record<ItemType, number> = { hero: 4, rotating: 2, special: 2 };
export const imageSlotsFor = (id: ItemId) => IMAGE_SLOTS[ITEM_FACTS[id].type];

export const DEFAULT_ITEMS: Record<ItemId, ItemConfig> = {
  'todays-catch': item("Today's Catch", 'Fresh from Malpe harbour', 'Landed {time}', 'Fresh catch', '#0B1F4D', { type: 'tab', id: 'fresh' }, ['Non Veg'], Y),
  'village-fresh': item('Village Fresh', 'Grown by farms near you', 'Picked today', 'Picked today', '#1E7A45', { type: 'tab', id: 'fresh' }),
  'veg-for-tomorrow': item('Veg for Tomorrow', 'Plan tomorrow’s cooking', 'For tomorrow', 'For tomorrow', '#1E7A45', { type: 'tab', id: 'fresh' }),
  'fresh-by-7': item('Fresh by 7 AM', 'At your door by morning', 'Order by {cutoff}', 'By 7 AM', '#5B21B6', { type: 'action', id: 'preorder-list' }),
  'fruits-vegetables': item('Fruits & Vegetables', 'Daily fresh from nearby shops', 'Fresh today', 'Fresh today', '#1E7A45', { type: 'tab', id: 'fresh' }),
  'milk-breakfast': item('Milk & Breakfast', 'Milk, bread, eggs and more', 'From ₹{min}', 'Morning fresh', '#155DFC', list([]), ['Milk & Dairy Drinks', 'Breakfast & Cereals', 'Butter, Cheese & Paneer', 'Biscuits & Bakery']),
  'your-usuals': item('Your Usuals', 'Your regular items, one tap', '{total} items', 'Buy again', '#155DFC', { type: 'action', id: 'add-usuals' }),
  'popular-near-you': item('Popular Near You', 'What neighbours buy most', 'Trending', 'Trending', '#155DFC', { type: 'action', id: 'popular' }),
  'breakfast-ready': item('Breakfast Ready', 'Idli rava, poha, oats', 'From ₹{min}', 'Quick breakfast', '#9A6700', list([]), ['Breakfast & Cereals', 'Noodles & Instant Food', 'Biscuits & Bakery']),
  'tea-coffee': item('Tea & Coffee', 'Filter coffee, tea, sugar', 'From ₹{min}', 'Chai time', '#9A5B00', list([]), ['Tea & Coffee', 'Sugar & Jaggery']),
  'lunch-essentials': item('Lunch Essentials', 'Rice, dal, oil, masalas', 'From ₹{min}', 'Cook today', '#C2410C', list([]), STAPLES),
  'offers-for-you': item('Offers for You', 'Deals on things you buy', 'Up to {pct}% off', 'Offers today', '#C2410C', { type: 'action', id: 'offers' }),
  'taste-of-tulunadu': item('Taste of Tulunadu', 'Coastal pickles and snacks', 'From ₹{min}', 'Local taste', '#C2410C', { type: 'tab', id: 'udupi' }, ['Local & Seasonal', 'Pickles, Pastes & Sauces', 'Spices & Masala']),
  'glo-bulk': item('Glo Bulk', 'Stock up on monthly staples', 'From ₹{min}', 'Bulk savings', '#9A6700', { type: 'action', id: 'bulk' }),
  'namma-brands': item('Namma Brands', 'Made in Udupi', 'Local makers', 'Local makers', '#5B21B6', { type: 'brands' }),
  'home-cleaning': item('Home & Cleaning', 'Cleaners, detergents', 'From ₹{min}', 'Clean home', '#0E7C66', list([]), ['Home Cleaners', 'Laundry', 'Pest Control']),
  'snack-time': item('Snack Time', 'Chips, biscuits, sweets', 'From ₹{min}', 'Snack break', '#9A6700', list([]), SNACKS),
  'cold-drinks': item('Cold Drinks', 'Juices, soft drinks, water', 'From ₹{min}', 'Chilled', '#0369A1', list([]), ['Drinks, Juices & Water']),
  'fish-meat': item('Fish & Meat', 'Fresh fish, chicken, mutton', 'From ₹{min}', 'Fresh cuts', '#0B1F4D', list([]), ['Non Veg'], Y),
  'tomorrow-by-7': item('Tomorrow by 7 AM', 'Milk and fish by morning', 'Order by {cutoff}', 'By 7 AM', '#5B21B6', { type: 'action', id: 'preorder-list' }),
  'ice-cream': item('Ice Cream', 'Cups, cones, family packs', 'From ₹{min}', 'Treat time', '#B0246A', list([]), ['Ice Cream']),
  'late-night-snacks': item('Late-night Snacks', 'Cravings after dinner', 'Open now', 'Open now', '#9A6700', list([]), [...SNACKS, 'Drinks, Juices & Water', 'Ice Cream']),
  'daily-needs': item('Daily Needs', 'Essentials, shops open now', 'Open now', 'Open now', '#475467', list([]), DAILY),
  'daily-essentials': item('Daily Essentials', 'Staples you run out of', 'From ₹{min}', 'Everyday', '#475467', list([]), DAILY),
  'party-orders': item('Party Orders', 'Snacks, drinks for a crowd', 'From ₹{min}', 'Plan ahead', '#B0246A', { type: 'action', id: 'party-form' }),
  'festival-needs': item('{festival} Needs', 'Sweets, dry fruits, pooja', 'From ₹{min}', 'Festive', '#9A6700', list([]), ['Sweets & Chocolates', 'Dry Fruits & Nuts', 'Incense & Dhoop']),
  'rainy-day': item('Rainy Day Cravings', 'Hot chai, bajji mix, noodles', 'From ₹{min}', 'Stay in', '#3E6A99', list([]), ['Tea & Coffee', 'Chips & Namkeen', 'Noodles & Instant Food']),
};
