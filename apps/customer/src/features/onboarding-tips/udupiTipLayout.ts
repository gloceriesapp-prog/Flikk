// Where the Udupi tab sits on screen, from HomeModeSwitch's fixed layout
// (screens/home/mode-switch/HomeModeSwitch.tsx): safe area, 4 pt top
// padding, 46 pt tabs in a row with 16 pt side padding and a 12 pt gap,
// Udupi second. The unselected tab is a 36 pt pill 6 pt above the tab foot.
// ponytail: mirrors those numbers instead of measuring; keep in step if the
// switch's layout changes.
const ROW_TOP = 4;
const TAB_HEIGHT = 46;
const SIDE = 16;
const GAP = 12;
const PILL_HEIGHT = 36;
const PILL_FOOT = 6;

export interface Rect { x: number; y: number; width: number; height: number }

export function udupiTabRect(screenWidth: number, topInset: number): Rect {
  const tabWidth = (screenWidth - SIDE * 2 - GAP) / 2;
  const y = topInset + ROW_TOP + TAB_HEIGHT - PILL_FOOT - PILL_HEIGHT;
  return { x: SIDE + tabWidth + GAP, y, width: tabWidth, height: PILL_HEIGHT };
}

export interface Point { x: number; y: number }

// Arrowhead for a quadratic curve ending at `end`: two strokes swept back
// from the tip along the curve's own end direction (end - control), so the
// head always points the way the line is travelling.
export function arrowHead(control: Point, end: Point, length = 11, spread = Math.PI / 6): string {
  const angle = Math.atan2(end.y - control.y, end.x - control.x);
  const wing = (side: number) => ({
    x: end.x - length * Math.cos(angle + side * spread),
    y: end.y - length * Math.sin(angle + side * spread),
  });
  const [a, b] = [wing(1), wing(-1)];
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(a.x)} ${r(a.y)} L${r(end.x)} ${r(end.y)} L${r(b.x)} ${r(b.y)}`;
}
