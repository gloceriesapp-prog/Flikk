import {
  GROCERY_IMAGE_BOTTOM_BLEED,
  quickCategoryArtwork,
} from '../src/screens/home/quick-categories/data';

// Home's Quick categories grid: the card image the admin sets on a tab
// (home_tabs.image_url) is shown on that tab's card.
const grocery = 'https://images.gloceries.com/appsui/grocery-default.png';

it("shows the admin's card image for any tab, as uploaded", () => {
  expect(quickCategoryArtwork({ tabImage: 'https://images.gloceries.com/appsui/fruit.webp', isGrocery: false, groceryImage: grocery }))
    .toEqual({ imageUrl: 'https://images.gloceries.com/appsui/fruit.webp', bottomBleed: 0, scale: 1 });
  // An admin image also replaces the built-in Grocery and festival artwork.
  expect(quickCategoryArtwork({ tabImage: 'https://x.test/g.webp', isGrocery: true, groceryImage: grocery, festivalImage: 'https://x.test/f.png' }))
    .toEqual({ imageUrl: 'https://x.test/g.webp', bottomBleed: 0, scale: 1 });
});

it('keeps the built-in Grocery and festival artwork when the tab has no image', () => {
  expect(quickCategoryArtwork({ isGrocery: true, groceryImage: grocery }))
    .toEqual({ imageUrl: grocery, bottomBleed: GROCERY_IMAGE_BOTTOM_BLEED, scale: 1 });
  expect(quickCategoryArtwork({ isGrocery: false, groceryImage: grocery, festivalImage: 'https://x.test/f.png' }))
    .toEqual({ imageUrl: 'https://x.test/f.png', bottomBleed: 0, scale: 1.12 });
});

it('leaves a tab with no image of any kind as a plain name card', () => {
  expect(quickCategoryArtwork({ isGrocery: false, groceryImage: grocery })).toEqual({ bottomBleed: 0, scale: 1 });
});
