export const CATEGORY_TAB_WIDTH = 76;
export const CATEGORY_TAB_GAP = 2;

export function centeredCategoryOffset(
  item: { x: number; width: number },
  viewportWidth: number,
  contentWidth: number,
) {
  const target = item.x + item.width / 2 - viewportWidth / 2;
  return Math.max(0, Math.min(target, Math.max(0, contentWidth - viewportWidth)));
}
