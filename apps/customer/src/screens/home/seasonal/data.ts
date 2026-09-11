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
}

const PLACEHOLDER_TILE_IMAGE = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/festival-images/banana.png';

// Capped at 4, per an explicit ask — SeasonalSection.tsx sizes VISIBLE_TILES
// to match so all 4 fit in the row with no peek-cut trailing tile.
export const SEASONAL_TILES: SeasonalTile[] = [
  { id: 'modak-prasad', title: 'Modak & Prasad', imageUrl: PLACEHOLDER_TILE_IMAGE },
  { id: 'pooja-essentials', title: 'Pooja Essentials', imageUrl: PLACEHOLDER_TILE_IMAGE },
  { id: 'banana-leaf-decor', title: 'Banana Leaves', imageUrl: PLACEHOLDER_TILE_IMAGE },
  { id: 'sweets-jaggery', title: 'Sweets & Jaggery', imageUrl: PLACEHOLDER_TILE_IMAGE },
];
