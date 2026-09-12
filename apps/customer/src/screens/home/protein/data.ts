// Placeholder content for the "Protein" category tab's sub-category tiles
// (labels/icons, not product cards). Subcategories are sports-nutrition/
// supplement lines (protein powder, gainer, creatine, etc.), not
// whole-food protein sources (eggs, paneer) — an explicit re-scoping of
// what this tab actually sells. PROTEIN_PRODUCTS (fabricated product
// data) was removed from this file per an explicit ask to strip every
// product-card dummy dataset out of the app.

import type { SubCategory } from '../category-tab/types';

export const PROTEIN_SUBCATEGORIES: SubCategory[] = [
  { id: 'protein-powder', label: 'Protein Powder', imageSeed: 'protein-powder' },
  { id: 'mass-gainer', label: 'Mass Gainer', imageSeed: 'protein-gainer' },
  { id: 'sugar-free-juice', label: 'Sugar-Free Juice', imageSeed: 'protein-juice' },
  { id: 'creatine', label: 'Creatine', imageSeed: 'protein-creatine' },
  { id: 'protein-oats', label: 'Protein Oats', imageSeed: 'protein-oats' },
  { id: 'vitamins', label: 'Vitamins', imageSeed: 'protein-vitamins' },
];
