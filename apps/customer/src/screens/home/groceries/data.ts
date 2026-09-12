// Placeholder content for the "Groceries" category tab's sub-category
// tiles (labels/icons, not product cards). FARM_PRODUCTS (fabricated
// product data) was removed from this file per an explicit ask to strip
// every product-card dummy dataset out of the app.

import type { SubCategory } from '../category-tab/types';

export const GROCERY_SUBCATEGORIES: SubCategory[] = [
  { id: 'fresh-fruits', label: 'Fresh fruits', imageSeed: 'sub-fruits' },
  { id: 'fresh-vegetable', label: 'Fresh vegetable', imageSeed: 'sub-veg' },
  { id: 'cuts-exotics', label: 'Cuts & exotics', imageSeed: 'sub-exotics' },
  { id: 'herbs-spice-mix', label: 'Herbs & spice mix', imageSeed: 'sub-herbs' },
  { id: 'dairy-plant-based', label: 'Dairy & plant-based', imageSeed: 'sub-dairy' },
  { id: 'meat-eggs-fish', label: 'Meat, eggs & fish', imageSeed: 'sub-meat' },
  { id: 'healthy-organic', label: 'Healthy & organic', imageSeed: 'sub-organic' },
  { id: 'breads-batters', label: 'Breads & batters', imageSeed: 'sub-breads' },
];
