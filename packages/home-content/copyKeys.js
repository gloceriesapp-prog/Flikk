// Single registry of admin-editable customer copy (app_content.copy, migration
// 100). The customer app's useCopy(key) falls back to `default` here; the admin
// "App content" page lists every key with its default so the founder can see
// exactly what is editable. Add a key here when a new customer string ships.
export const COPY_KEYS = {
  // Home "All" tab section headings (a Home Sections title override wins).
  'home.quickCategories.title': { default: 'Quick categories', hint: 'Home quick-categories heading' },
  'home.everydayDairy.title': { default: 'Everyday Dairy', hint: 'Home dairy row heading' },
  'home.trending.title': { default: 'Popular This Week', hint: 'Home 7-day popular row heading' },
  'home.trending.subtitle': { default: '', hint: 'Home 7-day popular row sub-text' },
  'home.mostBought.title': { default: 'Most Bought Near You', hint: 'Home 30-day most-bought row heading' },
  'home.mostBought.subtitle': { default: '', hint: 'Home most-bought row sub-text' },
  'home.dealsForYou.title': { default: 'Everyday Savings', hint: 'Home savings deals block heading' },
  'home.dealsForYou.subtitle': { default: 'Save more on products worth buying', hint: 'Home savings deals block sub-text' },
  'home.dealsForYou.cta': { default: 'See all deals', hint: 'Home savings deals block button' },
  'home.topRatedStores.title': { default: 'Top Rated Stores Near You', hint: 'Home top-rated stores heading' },
  'home.topRatedStores.subtitle': { default: '', hint: 'Home top-rated stores sub-text' },
  'home.todaysBestDeals.title': { default: 'Today’s Best Deals', hint: 'Home best-deals row heading' },
  'home.priceDrops.title': { default: 'Biggest Price Drops', hint: 'Home price-drop row heading' },
  'home.priceDrops.subtitle': { default: '', hint: 'Home price-drop row sub-text' },
  'home.everydayEssentials.title': { default: 'Everyday Essentials', hint: 'Home catalogue grid heading' },
  'home.everydayEssentials.subtitle': { default: '', hint: 'Home catalogue grid sub-text' },
  'home.newOnGloceries.title': { default: 'New on Gloceries', hint: 'Home newly-onboarded stores heading' },
  'home.newOnGloceries.subtitle': { default: '', hint: 'Home new stores sub-text' },
  'home.buyItAgain.title': { default: 'Buy It Again', hint: 'Home repeat-purchase row heading' },
  'home.groceries.bestSellers.title': { default: 'Best sellers near you', hint: 'Grocery tab best-sellers heading' },
  // Category tabs (Bakery, Protein, Meat & Fish and any admin tab).
  'home.categoryTab.products.title': { default: 'All products', hint: 'Category tab product grid heading' },
  'home.categoryTab.empty.title': { default: 'No products here yet', hint: 'Category tab with no products' },
  'home.categoryTab.empty.subtitle': { default: 'Check back soon — shops near you add new items often.', hint: 'Category tab empty sub-text' },
  'home.bakery.banner.title': { default: 'Baked fresh, every morning.', hint: 'Bakery tab banner heading' },
  'home.bakery.banner.body': { default: 'Bread, buns, and pastries straight from your local bakery — not a warehouse batch from yesterday.', hint: 'Bakery tab banner text' },
  // Store page and wishlist.
  'store.categories.title': { default: 'Shop by category', hint: 'Store page category grid heading' },
  'store.empty.title': { default: 'No items here yet.', hint: 'Store page with no matching products' },
  'wishlist.title': { default: 'Wishlist', hint: 'Wishlist screen title' },
  'wishlist.empty.title': { default: 'Nothing here yet', hint: 'Empty wishlist heading' },
  'wishlist.empty.subtitle': { default: 'Tap the heart on any product to save it here for later.', hint: 'Empty wishlist sub-text' },
  'wishlist.unavailable.note': { default: 'Some saved items are out of stock or their shop is closed right now.', hint: 'Wishlist note when items cannot be bought' },
  // Other screens (wired by their owners; listed so admin sees them).
  'home.search.placeholder': { default: '', hint: 'Home search bar placeholder' },
  'cart.empty.title': { default: '', hint: 'Empty cart heading' },
  'cart.empty.subtitle': { default: '', hint: 'Empty cart sub-text' },
  'checkout.placeOrder.cta': { default: '', hint: 'Place-order button label' },
  'orders.empty.title': { default: '', hint: 'No orders yet heading' },
  'support.hours.text': { default: '', hint: 'Support availability line' },
  'serviceability.unavailable.title': { default: '', hint: 'Area not serviceable heading' },
};

export function copyDefault(key) {
  return COPY_KEYS[key]?.default ?? '';
}
