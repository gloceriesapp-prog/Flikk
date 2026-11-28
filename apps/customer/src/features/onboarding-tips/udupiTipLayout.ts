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
