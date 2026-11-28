// Grid geometry: 3 columns; the hero spans 2 rows in column 1 and up to 4
// cards fill the 2x2. Fewer cards: 2x1 (hero one row tall), or hero alone.
export const SIDE = 16;
export const GAP = 10;
export const HERO_RADIUS = 20;
export const CARD_RADIUS = 18;
export const BORDER = '#EEF0F4';
export const TITLE_COLOR = '#101828';
export const LINE_COLOR = '#667085';
export const TAG_HEIGHT = 20;

export type GridShape = 'full' | 'row' | 'hero-only';
// Pure: how many cards to show and in which shape (never an odd gap).
export function gridShape(cardCount: number): { shape: GridShape; cards: number } {
  if (cardCount >= 4) return { shape: 'full', cards: 4 };
  if (cardCount >= 2) return { shape: 'row', cards: 2 };
  return { shape: 'hero-only', cards: 0 };
}

export function gridMetrics(screenWidth: number) {
  const column = Math.floor((screenWidth - SIDE * 2 - GAP * 2) / 3);
  const cardHeight = Math.round(column * 1.38);
  return { column, cardHeight, heroHeight: cardHeight * 2 + GAP, wide: column * 2 + GAP };
}

// A 10% wash of the accent for the image area (#RRGGBB -> #RRGGBB1A).
export const tint = (accent: string) => (/^#[0-9a-f]{6}$/i.test(accent) ? `${accent}1A` : '#F2F4F7');
