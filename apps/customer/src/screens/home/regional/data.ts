// "Meet Your Local Stores" — the trust/community-moat row (see the
// strategy discussion's §26 reference). Name + one-line story, not a
// product list — this row is about the merchant relationship itself.
//
// The four product rows this file used to also export (Coastal Kitchen
// Staples/Local Brands/Loose Items/Regional Snacks — all fabricated
// product data) are gone, per an explicit ask to strip every product-card
// dummy dataset out of the app.

export interface LocalStore {
  id: string;
  name: string;
  story: string;
  area: string;
}

export const LOCAL_STORES: LocalStore[] = [
  { id: 'store-ganesh-kirana', name: 'Ganesh Kirana Store', story: '30 years serving Kaup Market Junction', area: 'Kaup' },
  { id: 'store-udupi-daily-needs', name: 'Udupi Daily Needs', story: 'Family-run since 1998, known for fresh spices', area: 'Kaup Beach Road' },
  { id: 'store-anantha-provisions', name: 'Anantha Provision Store', story: 'The go-to for loose grains and pulses', area: 'Kaup' },
  { id: 'store-shetty-fish-mart', name: 'Shetty Fish Mart', story: 'Daily boat-fresh catch, three generations running', area: 'Outer Udupi' },
];
