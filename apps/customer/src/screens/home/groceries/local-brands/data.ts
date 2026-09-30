export interface LocalPantryBrand {
  id: string;
  name: string;
  imageUrl?: string;
  monogram: string;
  category: string;
  story: string;
  origin: string;
  verified: boolean;
  productIds: string[];
  tint: string;
  accent: string;
}

// Populate only after local origin and brand identity have been checked.
// Product IDs link real pantry listings; store district alone is not proof
// that a product's brand is local. There is no brand table/API yet.
export const VERIFIED_LOCAL_BRANDS: LocalPantryBrand[] = [];

// Fictional design concepts, clearly labelled Preview throughout the UI.
export const PREVIEW_LOCAL_BRANDS: LocalPantryBrand[] = [
  { id: 'preview-coastal-pantry', name: 'Coastal Pantry', monogram: 'CP', category: 'Rice & pantry staples', story: 'A concept for discovering the pantry makers closer to home.', origin: 'Concept brand', verified: false, productIds: [], tint: '#F5EDDD', accent: '#80613B' },
  { id: 'preview-local-spice', name: 'Local Spice Co.', monogram: 'LS', category: 'Masalas & spices', story: 'A concept for bringing regional flavours into your everyday cooking.', origin: 'Concept brand', verified: false, productIds: [], tint: '#F6E8E0', accent: '#9B593D' },
  { id: 'preview-neighbourhood-mill', name: 'Neighbourhood Mill', monogram: 'NM', category: 'Flour & grains', story: 'A concept for discovering the basics behind your favourite meals.', origin: 'Concept brand', verified: false, productIds: [], tint: '#EAF0E4', accent: '#526A36' },
];
