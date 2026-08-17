// Shared shape for every product card on Home — Fresh Fish, Today's Steal
// Deals, Everyday essentials, Coastal Kitchen picks all use this, not their
// own copy. See ProductCard.tsx.

export interface Product {
  id: string;
  name: string;
  localName: string;
  weight: string;
  price: number;
  originalPrice?: number;
  rating: number;
  ratingCount: string;
  imageSeed: string;
}
