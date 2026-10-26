import { storageUrl } from '../../../utils/storageUrl';
export const GROCERY_QUICK_CATEGORY_IMAGE =
  storageUrl('Images/Everyday%20Indian%20Grocery%20Staples.png');

// Push the artwork through the card's bottom edge so its transparent canvas
// and uneven product baseline cannot leave a visible strip underneath.
export const GROCERY_IMAGE_BOTTOM_BLEED = 24;

// Which artwork a Quick categories card shows. The admin's own card image
// for the tab (Home tabs & tiles → Card image) wins; without one, Grocery
// keeps its bundled staples artwork (App content can swap it) and the
// festival tab its festival header art. bleed/scale only fit those built-in
// pictures, so an admin image is drawn as uploaded.
export function quickCategoryArtwork(options: {
  tabImage?: string;
  isGrocery: boolean;
  groceryImage: string;
  festivalImage?: string;
}): { imageUrl?: string; bottomBleed: number; scale: number } {
  if (options.tabImage) return { imageUrl: options.tabImage, bottomBleed: 0, scale: 1 };
  if (options.isGrocery) return { imageUrl: options.groceryImage, bottomBleed: GROCERY_IMAGE_BOTTOM_BLEED, scale: 1 };
  if (options.festivalImage) return { imageUrl: options.festivalImage, bottomBleed: 0, scale: 1.12 };
  return { bottomBleed: 0, scale: 1 };
}
