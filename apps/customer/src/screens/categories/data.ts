// Placeholder category grid, grouped by section — matches the reference's
// "Grocery & Kitchen" / "Snacks & Drinks" grouping. Real data should come
// from a categories endpoint once one exists (none of specs/00-foundation's
// endpoint table has one yet — this is UI-only placeholder content, same
// caveat as screens/home/products/).

export interface CategoryTile {
  id: string;
  label: string;
  imageSeed: string;
}

export interface CategorySectionData {
  title: string;
  items: CategoryTile[];
}

export const CATEGORY_SECTIONS: CategorySectionData[] = [
  {
    title: 'Grocery & Kitchen',
    items: [
      { id: 'vegetables-fruits', label: 'Vegetables & Fruits', imageSeed: 'cat-veg-fruit' },
      { id: 'atta-rice-dal', label: 'Atta, Rice & Dal', imageSeed: 'cat-atta-rice' },
      { id: 'oil-ghee-masala', label: 'Oil, Ghee & Masala', imageSeed: 'cat-oil-ghee' },
      { id: 'dairy-bread-eggs', label: 'Dairy, Bread & Eggs', imageSeed: 'cat-dairy-bread' },
      { id: 'bakery-biscuits', label: 'Bakery & Biscuits', imageSeed: 'cat-bakery' },
      { id: 'dry-fruits-cereals', label: 'Dry Fruits & Cereals', imageSeed: 'cat-dry-fruits' },
      { id: 'chicken-meat-fish', label: 'Chicken, Meat & Fish', imageSeed: 'cat-chicken-fish' },
      { id: 'kitchenware-appliances', label: 'Kitchenware & Appliances', imageSeed: 'cat-kitchenware' },
    ],
  },
  {
    title: 'Snacks & Drinks',
    items: [
      { id: 'chips-namkeen', label: 'Chips & Namkeen', imageSeed: 'cat-chips' },
      { id: 'sweets-chocolates', label: 'Sweets & Chocolates', imageSeed: 'cat-sweets' },
      { id: 'drinks-juices', label: 'Drinks & Juices', imageSeed: 'cat-drinks' },
      { id: 'tea-coffee-milk', label: 'Tea, Coffee & Milk Drinks', imageSeed: 'cat-tea-coffee' },
    ],
  },
  {
    title: 'Household & Personal Care',
    items: [
      { id: 'cleaning-essentials', label: 'Cleaning Essentials', imageSeed: 'cat-cleaning' },
      { id: 'personal-care', label: 'Personal Care', imageSeed: 'cat-personal-care' },
      { id: 'baby-care', label: 'Baby Care', imageSeed: 'cat-baby-care' },
      { id: 'pet-care', label: 'Pet Care', imageSeed: 'cat-pet-care' },
    ],
  },
];
