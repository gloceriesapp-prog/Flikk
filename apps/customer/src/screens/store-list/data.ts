// Placeholder store list. Fictional names, same convention as
// screens/search/data.ts's Top Grocery Stores row — not real chains. No
// stores endpoint wired to any screen yet, even though `stores` already
// exists in specs/00-foundation/data-model.md.

export interface StoreListing {
  id: string;
  name: string;
  description: string;
  isOpen: boolean;
  distanceKm: number;
}

export const STORE_LISTINGS: StoreListing[] = [
  { id: 'shetty-stores', name: 'Shetty Stores', description: 'Kirana & Daily Needs', isOpen: true, distanceKm: 0.6 },
  { id: 'krishna-mart', name: 'Krishna Mart', description: 'Grocery & Pharmacy', isOpen: true, distanceKm: 0.9 },
  { id: 'coastal-fresh', name: 'Coastal Fresh', description: 'Fish & Vegetables', isOpen: true, distanceKm: 1.2 },
  { id: 'udupi-grocers', name: 'Udupi Grocers', description: 'Kirana & Daily Needs', isOpen: false, distanceKm: 1.4 },
  { id: 'bunts-bazaar', name: 'Bunts Bazaar', description: 'General Store', isOpen: true, distanceKm: 1.8 },
  { id: 'durga-stores', name: 'Sri Durga Stores', description: 'Grocery & Snacks', isOpen: true, distanceKm: 2.1 },
  { id: 'malpe-mart', name: 'Malpe Mart', description: 'Kirana & Daily Needs', isOpen: false, distanceKm: 2.5 },
  { id: 'karkala-kirana', name: 'Karkala Kirana', description: 'General Store', isOpen: true, distanceKm: 3.0 },
];
