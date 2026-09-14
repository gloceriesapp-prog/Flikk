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
//
// Every tile points at the same placeholder image (banana.png) for now,
// per an explicit ask — real per-tile photos come later, this just proves
// the image-tile layout works before that content exists.

export interface SeasonalTile {
  id: string;
  title: string;
  imageUrl: string;
  // Each tile's own card background — per an explicit ask to move away
  // from white cards on a tinted panel toward tinted cards on a white
  // panel (PANEL_BG in SeasonalSection.tsx). A curated festival-pastel
  // per tile, not one repeated color, so a 2x2 grid doesn't read as flat.
  bgColor: string;
}

const PLACEHOLDER_TILE_IMAGE = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/festival-images/banana.png';

// Capped at 4 — SeasonalSection.tsx renders these as a fixed 2x2 grid, no
// scrolling, so a 5th tile would have nowhere to go without breaking that
// layout; trim the list before adding one.
export const SEASONAL_TILES: SeasonalTile[] = [
  { id: 'modak-prasad', title: 'Modak & Prasad', imageUrl: PLACEHOLDER_TILE_IMAGE, bgColor: '#FBE4C8' },
  { id: 'pooja-essentials', title: 'Pooja Essentials', imageUrl: PLACEHOLDER_TILE_IMAGE, bgColor: '#E3EEDD' },
  { id: 'banana-leaf-decor', title: 'Banana Leaves', imageUrl: PLACEHOLDER_TILE_IMAGE, bgColor: '#F4E0E0' },
  { id: 'sweets-jaggery', title: 'Sweets & Jaggery', imageUrl: PLACEHOLDER_TILE_IMAGE, bgColor: '#EAE1F5' },
];
