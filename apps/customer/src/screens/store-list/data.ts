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
  rating: number;
  ratingCount: string;
  etaMinutes: number;
  ownerNote: string;
}

export const STORE_LISTINGS: StoreListing[] = [
  { id: 'shetty-stores', name: 'Shetty Stores', description: 'Kirana & Daily Needs', isOpen: true, distanceKm: 0.6, rating: 4.6, ratingCount: '320+ orders', etaMinutes: 12, ownerNote: 'Run by the Shetty family since 1998' },
  { id: 'krishna-mart', name: 'Krishna Mart', description: 'Grocery & Pharmacy', isOpen: true, distanceKm: 0.9, rating: 4.4, ratingCount: '210+ orders', etaMinutes: 15, ownerNote: "Your neighbourhood's trusted pharmacy corner" },
  { id: 'coastal-fresh', name: 'Coastal Fresh', description: 'Fish & Vegetables', isOpen: true, distanceKm: 1.2, rating: 4.8, ratingCount: '450+ orders', etaMinutes: 18, ownerNote: 'Daily catch, straight off the Kaup boats' },
  { id: 'udupi-grocers', name: 'Udupi Grocers', description: 'Kirana & Daily Needs', isOpen: false, distanceKm: 1.4, rating: 4.3, ratingCount: '180+ orders', etaMinutes: 20, ownerNote: 'A local favourite for 15+ years' },
  { id: 'bunts-bazaar', name: 'Bunts Bazaar', description: 'General Store', isOpen: true, distanceKm: 1.8, rating: 4.5, ratingCount: '260+ orders', etaMinutes: 22, ownerNote: 'Everything your household needs, one stop' },
  { id: 'durga-stores', name: 'Sri Durga Stores', description: 'Grocery & Snacks', isOpen: true, distanceKm: 2.1, rating: 4.2, ratingCount: '140+ orders', etaMinutes: 24, ownerNote: 'Family-owned, stocked fresh every morning' },
  { id: 'malpe-mart', name: 'Malpe Mart', description: 'Kirana & Daily Needs', isOpen: false, distanceKm: 2.5, rating: 4.1, ratingCount: '95+ orders', etaMinutes: 27, ownerNote: 'Malpe beach road regular since 2010' },
  { id: 'karkala-kirana', name: 'Karkala Kirana', description: 'General Store', isOpen: true, distanceKm: 3.0, rating: 4.4, ratingCount: '175+ orders', etaMinutes: 30, ownerNote: 'Known for honest prices, no bargaining needed' },
];
