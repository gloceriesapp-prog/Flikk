// Default copy, colours, data checks and tap targets for every grid card and
// hero. Admin can override title, line, accent, target list and enabled per
// card (config.ts); the rest is fixed here. Category names are products.category
// values. Lines are first drafts; replace with the canvas catalogue copy.
import type { CardDef, CardId, HeroId } from './types.js';

const BLUE = '#155DFC', AMBER = '#F2A900', BROWN = '#9A5B00', CORAL = '#E8552A', VIOLET = '#5B21B6';
const TEAL = '#0E7C66', CYAN = '#0096C7', NAVY = '#0B1F4D', BERRY = '#B0246A', SLATE = '#475467';
const RAIN = '#3E6A99', GREEN = '#1FA35C';
export const NAVY_TAG_TEXT = '#FFD84D';

const SNACKS = ['Chips & Namkeen', 'Biscuits & Bakery', 'Sweets & Chocolates', 'Frozen Snacks'];
const STAPLES = ['Rice, Atta & Dal', 'Oils & Ghee', 'Spices & Masala', 'Pickles, Pastes & Sauces'];
const DAILY = ['Milk & Dairy Drinks', 'Rice, Atta & Dal', 'Oils & Ghee', 'Bath & Body', 'Oral Care', 'Laundry'];
const categories = (min = 3) => ({ kind: 'categories', min } as const);
const list = (names: string[]) => ({ type: 'categories', categories: names } as const);

type Def = Omit<CardDef, 'id'>;
export const CARD_CATALOG: Record<CardId, Def> = {
  'milk-breakfast': { title: 'Milk & Breakfast', tag: 'From ₹{min}', fallbackTag: 'Morning fresh', line: 'Milk, bread, eggs and more', accent: BLUE,
    categories: ['Milk & Dairy Drinks', 'Breakfast & Cereals', 'Butter, Cheese & Paneer', 'Biscuits & Bakery'], check: categories(), target: list([]) },
  'your-usuals': { title: 'Your Usuals', tag: '{total} items', fallbackTag: 'Buy again', line: 'Add your regular items in one tap', accent: BLUE,
    categories: [], check: { kind: 'usuals' }, target: { type: 'usuals' } },
  'popular-near-you': { title: 'Popular Near You', tag: 'Trending', fallbackTag: 'Trending', line: 'What your neighbours buy most', accent: BLUE,
    categories: [], check: { kind: 'popular' }, target: { type: 'popular' } },
  'breakfast-ready': { title: 'Breakfast Ready', tag: 'From ₹{min}', fallbackTag: 'Quick breakfast', line: 'Idli rava, poha, oats and cereals', accent: AMBER,
    categories: ['Breakfast & Cereals', 'Noodles & Instant Food', 'Biscuits & Bakery'], check: categories(), target: list([]) },
  'tea-coffee': { title: 'Tea & Coffee', tag: 'From ₹{min}', fallbackTag: 'Chai time', line: 'Filter coffee, tea and sugar', accent: BROWN,
    categories: ['Tea & Coffee', 'Sugar & Jaggery'], check: categories(), target: list([]) },
  'lunch-essentials': { title: 'Lunch Essentials', tag: 'From ₹{min}', fallbackTag: 'Cook today', line: 'Rice, dal, oil and masalas', accent: CORAL,
    categories: STAPLES, check: categories(), target: list([]) },
  'offers-for-you': { title: 'Offers for You', tag: 'Up to {pct}% off', fallbackTag: 'Offers today', line: 'Deals on things you buy', accent: CORAL,
    categories: [], check: { kind: 'offers' }, target: { type: 'offers' } },
  'taste-of-tulunadu': { title: 'Taste of Tulunadu', tag: 'From ₹{min}', fallbackTag: 'Local taste', line: 'Coastal pickles, snacks and spices', accent: CORAL,
    categories: ['Local & Seasonal', 'Pickles, Pastes & Sauces', 'Spices & Masala'], check: categories(), target: { type: 'tab', id: 'udupi' } },
  'glo-bulk': { title: 'Glo Bulk', tag: 'From ₹{min}', fallbackTag: 'Bulk savings', line: 'Stock up on monthly staples', accent: AMBER,
    categories: [], check: { kind: 'bulk' }, target: { type: 'bulk' } },
  'namma-brands': { title: 'Namma Brands', tag: 'Local brands', fallbackTag: 'Local brands', line: 'Made right here in Udupi', accent: VIOLET,
    categories: [], check: { kind: 'brands' }, target: { type: 'brands' } },
  'home-cleaning': { title: 'Home & Cleaning', tag: 'From ₹{min}', fallbackTag: 'Clean home', line: 'Cleaners, detergents and more', accent: TEAL,
    categories: ['Home Cleaners', 'Laundry', 'Pest Control'], check: categories(), target: list([]) },
  'snack-time': { title: 'Snack Time', tag: 'From ₹{min}', fallbackTag: 'Snack break', line: 'Chips, biscuits and sweets', accent: AMBER,
    categories: SNACKS, check: categories(), target: list([]) },
  'cold-drinks': { title: 'Cold Drinks', tag: 'From ₹{min}', fallbackTag: 'Chilled', line: 'Juices, soft drinks and water', accent: CYAN,
    categories: ['Drinks, Juices & Water'], check: categories(), target: list([]) },
  'fish-meat': { title: 'Fish & Meat', tag: 'From ₹{min}', fallbackTag: 'Fresh cuts', line: 'Fresh fish, chicken and mutton', accent: NAVY, tagText: NAVY_TAG_TEXT,
    categories: ['Non Veg'], check: categories(), target: list([]) },
  'tomorrow-by-7': { title: 'Tomorrow by 7 AM', tag: 'Order by {cutoff}', fallbackTag: 'By 7 AM', line: 'Milk and fish at your door early', accent: VIOLET,
    categories: [], check: { kind: 'preorder' }, target: { type: 'tab', id: 'preorder' } },
  'ice-cream': { title: 'Ice Cream', tag: 'From ₹{min}', fallbackTag: 'Treat time', line: 'Cups, cones and family packs', accent: BERRY,
    categories: ['Ice Cream'], check: categories(), target: list([]) },
  'late-night-snacks': { title: 'Late-night Snacks', tag: 'Open now', fallbackTag: 'Open now', line: 'Cravings sorted after dinner', accent: AMBER,
    categories: [...SNACKS, 'Drinks, Juices & Water', 'Ice Cream'], check: { kind: 'storeOpen' }, target: list([]) },
  'daily-needs': { title: 'Daily Needs', tag: 'Open now', fallbackTag: 'Open now', line: 'Essentials from shops open now', accent: SLATE,
    categories: DAILY, check: { kind: 'storeOpen' }, target: list([]) },
  'daily-essentials': { title: 'Daily Essentials', tag: 'From ₹{min}', fallbackTag: 'Everyday', line: 'Staples you run out of', accent: SLATE,
    categories: DAILY, check: categories(), target: list([]) },
  'party-orders': { title: 'Party Orders', tag: 'Plan ahead', fallbackTag: 'Plan ahead', line: 'Snacks and drinks for a crowd', accent: BERRY,
    categories: [], check: { kind: 'party' }, target: { type: 'form', id: 'party' } },
  'festival-needs': { title: 'Festival Needs', tag: 'From ₹{min}', fallbackTag: 'Festive', line: 'Sweets, dry fruits and pooja items', accent: AMBER,
    categories: ['Sweets & Chocolates', 'Dry Fruits & Nuts', 'Incense & Dhoop'], check: categories(), target: list([]) },
  'rainy-day': { title: 'Rainy Day Cravings', tag: 'From ₹{min}', fallbackTag: 'Stay in', line: 'Hot chai, bajji mix and noodles', accent: RAIN,
    categories: ['Tea & Coffee', 'Chips & Namkeen', 'Noodles & Instant Food'], check: categories(), target: list([]) },
};
export const CARD_IDS = Object.keys(CARD_CATALOG) as CardId[];

export interface HeroDef { title: string; tag: string; line: string; accent: string; tagText?: string }
export const HERO_CATALOG: Record<HeroId, HeroDef> = {
  'todays-catch': { title: "Today's Catch", tag: 'Landed {time}', line: 'Fresh from Malpe harbour', accent: NAVY, tagText: NAVY_TAG_TEXT },
  'village-fresh': { title: 'Village Fresh', tag: 'Picked today', line: 'Grown by farms near you', accent: GREEN },
  'veg-for-tomorrow': { title: 'Veg for Tomorrow', tag: 'For tomorrow', line: 'Plan tomorrow’s cooking tonight', accent: GREEN },
  'fresh-by-7': { title: 'Fresh by 7 AM', tag: 'By 7 AM', line: 'Book now, at your door by morning', accent: VIOLET },
  'fruits-vegetables': { title: 'Fruits & Vegetables', tag: 'Fresh today', line: 'Daily fresh from nearby shops', accent: GREEN },
};
