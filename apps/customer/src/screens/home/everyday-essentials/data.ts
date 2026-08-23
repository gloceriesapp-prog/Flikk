// Placeholder content for the "Everyday essentials" row. Same caveat as
// every other placeholder dataset in screens/home/ — no real catalog
// backend behind this yet, see specs/01-customer-app/screens.md for what
// replaces it. ratingCount uses "lac"/"k" mixed the same way the reference
// screenshot does — not a typo, real Indian grocery apps show whichever
// reads shorter for the number.

import { BAKERY_PRODUCTS } from '../bakery/data';
import { FARM_PRODUCTS } from '../groceries/data';
import type { Product } from '../products/types';

export const EVERYDAY_ESSENTIALS_PRODUCTS: Product[] = [
  {
    id: 'nandini-curd',
    name: 'Nandini Pouch Curd',
    localName: 'Mosaru',
    weight: '500 g',
    price: 28,
    rating: 4.5,
    ratingCount: '1.2 lac',
    imageSeed: 'essential-curd',
    freshnessTag: "Today's Fresh",
    categoryLabel: 'Dairy, Bread & Eggs',
    description: 'Thick, set curd made from fresh toned milk — no added sugar, no preservatives.',
    storeName: 'Udupi Daily Needs',
    replacementPolicy: 'Not eligible for return or replacement',
    deliveryEtaMinutes: 8,
    sizeOptions: ['250 g', '1 kg'],
    sellerDetails: {
      name: 'Spwave Pvt Ltd - Udupi',
      fssaiNumber: '11225328000268',
      address:
        'S.no 83/11A2,83 Moodanidamboor Village, Udupi Ashraya Towers, Near Jodukatte, Court Road, Udupi - 576101, Karnataka.',
    },
  },
  {
    id: 'nandini-milk',
    name: 'Nandini Toned Milk',
    localName: 'Haalu',
    weight: '500 ml',
    price: 24,
    rating: 4.4,
    ratingCount: '1.1 lac',
    imageSeed: 'essential-milk',
    freshnessTag: "Today's Fresh",
    categoryLabel: 'Dairy, Bread & Eggs',
    description: 'Pasteurized toned milk, packed fresh every morning — best consumed the same day.',
    storeName: 'Udupi Daily Needs',
    replacementPolicy: 'Not eligible for return or replacement',
    deliveryEtaMinutes: 8,
  },
  {
    id: 'onion',
    name: 'Onion',
    localName: 'Eerulli',
    weight: '1 kg',
    price: 34,
    originalPrice: 39,
    rating: 4.2,
    ratingCount: '85k',
    imageSeed: 'essential-onion',
    categoryLabel: 'Vegetables & Fruits',
    description: 'Firm, medium-sized onions — sourced fresh, sorted by hand before packing.',
    storeName: 'Malpe Fresh Mart',
    replacementPolicy: '48 hours only replacement',
    deliveryEtaMinutes: 12,
  },
  {
    id: 'toor-dal',
    name: 'Toor Dal',
    localName: 'Togari Bele',
    weight: '1 kg',
    price: 165,
    originalPrice: 185,
    rating: 4.6,
    ratingCount: '62k',
    imageSeed: 'essential-toor-dal',
    categoryLabel: 'Atta, Rice & Dal',
    description: 'Unpolished split pigeon peas — cooks soft, no added colour.',
    storeName: 'Ganesh Kirana Store',
    replacementPolicy: '7 days replacement only',
    deliveryEtaMinutes: 15,
  },
  {
    id: 'sunflower-oil',
    name: 'Sunflower Oil',
    localName: 'Sooryakanti Enne',
    weight: '1 L',
    price: 145,
    rating: 4.5,
    ratingCount: '48k',
    imageSeed: 'essential-oil',
    categoryLabel: 'Oil, Ghee & Masala',
    description: 'Refined sunflower oil, light on the palate — good for daily cooking and deep frying.',
    storeName: 'Ganesh Kirana Store',
    replacementPolicy: '7 days replacement only',
    deliveryEtaMinutes: 15,
  },
];

// ProductDetailSheet's SimilarProductsRow needs the *other* products at
// definition time, so this is assigned after the array exists rather than
// inline in the literal above (can't self-reference a const while it's
// still being built). 9 total (3x3 grid) — pulls in bakery/groceries too
// since everyday-essentials alone only has 4 other entries.
EVERYDAY_ESSENTIALS_PRODUCTS[0].relatedProducts = [
  ...EVERYDAY_ESSENTIALS_PRODUCTS.slice(1),
  ...BAKERY_PRODUCTS.slice(0, 2),
  ...FARM_PRODUCTS.slice(0, 3),
];
