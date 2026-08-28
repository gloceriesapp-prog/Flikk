// Placeholder content for the "Protein" category tab. Same caveat as every
// other placeholder dataset in screens/home/ — no real catalog backend behind
// this yet, see specs/01-customer-app/screens.md for what replaces it.
//
// Subcategories are sports-nutrition/supplement lines (protein powder,
// gainer, creatine, etc.), not whole-food protein sources (eggs, paneer) —
// an explicit re-scoping of what this tab actually sells. Banner photo is
// real admin data now (ProteinTab.tsx's own banner prop), not a hardcoded
// constant here anymore.

import type { Product } from '../products/types';
import type { SubCategory } from '../category-tab/types';

export const PROTEIN_SUBCATEGORIES: SubCategory[] = [
  { id: 'protein-powder', label: 'Protein Powder', imageSeed: 'protein-powder' },
  { id: 'mass-gainer', label: 'Mass Gainer', imageSeed: 'protein-gainer' },
  { id: 'sugar-free-juice', label: 'Sugar-Free Juice', imageSeed: 'protein-juice' },
  { id: 'creatine', label: 'Creatine', imageSeed: 'protein-creatine' },
  { id: 'protein-oats', label: 'Protein Oats', imageSeed: 'protein-oats' },
  { id: 'vitamins', label: 'Vitamins', imageSeed: 'protein-vitamins' },
];

export const PROTEIN_PRODUCTS: Product[] = [
  { id: 'whey-protein', name: 'Whey Protein Powder', localName: 'Protein Powder', weight: '1 kg', price: 1899, originalPrice: 2199, rating: 4.6, ratingCount: '2.1k', imageSeed: 'protein-whey' },
  { id: 'mass-gainer-3kg', name: 'Mass Gainer', localName: 'Gainer', weight: '3 kg', price: 2499, originalPrice: 2899, rating: 4.4, ratingCount: '1.3k', imageSeed: 'protein-mass-gainer' },
  { id: 'monohydrate-creatine', name: 'Creatine Monohydrate', localName: 'Creatine', weight: '250 g', price: 899, rating: 4.5, ratingCount: '1.8k', imageSeed: 'protein-creatine-jar' },
  { id: 'multivitamin-tablets', name: 'Multivitamin Tablets', localName: 'Vitamins', weight: '60 tabs', price: 449, originalPrice: 549, rating: 4.3, ratingCount: '2.6k', imageSeed: 'protein-multivitamin' },
];
