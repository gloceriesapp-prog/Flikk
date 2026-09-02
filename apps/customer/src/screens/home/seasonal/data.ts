// Content for the seasonal home-tile grid — deliberately NOT named after
// any one festival (this used to be ganesh-chaturthi/data.ts, renamed per
// an explicit ask: this section gets reskinned per festival, so the file
// itself shouldn't be tied to whichever one is live right now). Swap
// SEASONAL_TILES's contents when the festival changes; nothing else in
// SeasonalSection.tsx needs touching.
//
// Same mock-data caveat as every other Home dataset in screens/home/ — no
// real catalog backend yet (see coastal-kitchen-picks/data.ts's own
// note). SeasonalSection.tsx renders nothing if this list is empty, so an
// empty list here turns the whole section off, never a placeholder
// category with nothing behind it.

export interface SeasonalTile {
  id: string;
  title: string;
  emoji: string;
  price?: number;
  originalPrice?: number;
}

// 3 columns x 2 rows (SeasonalSection.tsx's own grid) — 6 keeps every row
// full; a count that isn't a multiple of 3 leaves a gap in the last row.
export const SEASONAL_TILES: SeasonalTile[] = [
  { id: 'modak-prasad', title: 'Modak & Prasad', emoji: '🍡', price: 85, originalPrice: 95 },
  { id: 'pooja-essentials', title: 'Pooja Essentials', emoji: '🌺' },
  { id: 'banana-leaf-decor', title: 'Banana Leaves', emoji: '🍌' },
  { id: 'sweets-jaggery', title: 'Sweets & Jaggery', emoji: '🍯', price: 55, originalPrice: 65 },
  { id: 'incense-diya', title: 'Incense & Diya', emoji: '🪔' },
  { id: 'flowers-garland', title: 'Flowers & Garland', emoji: '💐' },
];
