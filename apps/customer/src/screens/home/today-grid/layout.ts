// Grid geometry: 3 columns; the hero spans 2 rows in column 1 and up to 4
// cards fill the 2x2. Fewer cards: 2x1 (hero one row tall), or hero alone.
// Bento look: a light-blue rounded block inset from the screen edges; the
// header artwork and the white cards share one width inside it.
export const BLOCK_BG = '#D1E1FE';
export const MARGIN = 10;
export const SIDE = 10;
export const GAP = 8;
export const RADIUS = 18;
export const BLOCK_RADIUS = 20;
export const BORDER = '#E6ECF7';
export const TITLE_COLOR = '#101828';
export const LINE_COLOR = '#667085';
// Two-tone tag pill on top of every card: one style for all cards.
export const TAG_HEIGHT = 22;
export const TAG_LEAD_BG = '#474A40';
export const TAG_LEAD_TEXT = '#FFFFFF';
export const TAG_VALUE_BG = '#E2E175';
export const TAG_VALUE_TEXT = '#111715';

export type GridShape = 'full' | 'row' | 'hero-only';
// Pure: how many cards to show and in which shape (never an odd gap).
export function gridShape(cardCount: number): { shape: GridShape; cards: number } {
  if (cardCount >= 4) return { shape: 'full', cards: 4 };
  if (cardCount >= 2) return { shape: 'row', cards: 2 };
  return { shape: 'hero-only', cards: 0 };
}

export function gridMetrics(screenWidth: number) {
  const column = Math.floor((screenWidth - MARGIN * 2 - SIDE * 2 - GAP * 2) / 3);
  // Near-square cards: tag and title on top, photos fill the rest.
  const cardHeight = Math.round(column * 1.2);
  // 2x1: one taller row, so the hero's title, price and photo still fit.
  return { column, cardHeight, heroHeight: cardHeight * 2 + GAP, rowHeight: Math.round(cardHeight * 1.25), wide: column * 2 + GAP,
    inner: screenWidth - MARGIN * 2 - SIDE * 2 };
}
