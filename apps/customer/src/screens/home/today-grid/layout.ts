// Grid geometry: 3 columns; the hero spans 2 rows in column 1 and up to 4
// cards fill the 2x2. Fewer cards: 2x1 (hero one row tall), or hero alone.
// Bento look (same as the Namma Brands preview): a light-blue rounded block
// inset from the screen edges, white cards with a rounded pill on top.
export const BLOCK_BG = '#D0E0FD';
export const MARGIN = 10;
export const SIDE = 10;
export const GAP = 8;
export const RADIUS = 18;
export const BLOCK_RADIUS = 20;
export const BORDER = '#E6ECF7';
export const TITLE_COLOR = '#101828';
export const LINE_COLOR = '#667085';

export type GridShape = 'full' | 'row' | 'hero-only';
// Pure: how many cards to show and in which shape (never an odd gap).
export function gridShape(cardCount: number): { shape: GridShape; cards: number } {
  if (cardCount >= 4) return { shape: 'full', cards: 4 };
  if (cardCount >= 2) return { shape: 'row', cards: 2 };
  return { shape: 'hero-only', cards: 0 };
}

export function gridMetrics(screenWidth: number) {
  const column = Math.floor((screenWidth - MARGIN * 2 - SIDE * 2 - GAP * 2) / 3);
  const cardHeight = Math.round(column * 0.97);
  const pillHeight = Math.max(15, Math.round(column * 0.15));
  // 2x1: one taller row, so the hero's title, price and photo still fit.
  return { column, cardHeight, pillHeight, heroHeight: cardHeight * 2 + GAP, rowHeight: Math.round(cardHeight * 1.5), wide: column * 2 + GAP,
    inner: screenWidth - MARGIN * 2 - SIDE * 2 };
}
