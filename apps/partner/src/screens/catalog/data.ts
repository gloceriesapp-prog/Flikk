// Placeholder catalog (P4) — same no-auth caveat as ../orders/data.ts.
// Shape mirrors `products` (specs/00-foundation/data-model.md) closely
// enough that swapping in `GET /partner/products` later is a data change.

export interface PartnerProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  isInStock: boolean;
}

export const PLACEHOLDER_PRODUCTS: PartnerProduct[] = [
  { id: 'p1', name: 'Nandini Pouch Curd', category: 'Dairy', unit: '500 g', price: 28, isInStock: true },
  { id: 'p2', name: 'Nandini Toned Milk', category: 'Dairy', unit: '500 ml', price: 24, isInStock: true },
  { id: 'p3', name: 'Onion (Eerulli)', category: 'Vegetables', unit: '1 kg', price: 34, isInStock: true },
  { id: 'p4', name: 'Basmati Rice', category: 'Staples', unit: '1 kg', price: 95, isInStock: false },
  { id: 'p5', name: 'Cow Ghee', category: 'Dairy', unit: '500 ml', price: 320, isInStock: true },
  { id: 'p6', name: 'Toor Dal', category: 'Staples', unit: '500 g', price: 68, isInStock: false },
];
