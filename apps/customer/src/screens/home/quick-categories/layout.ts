import type { Category } from '../data/categoryTabs';

export interface QuickCategoryCell {
  category: Category;
  weight: number;
}

// Alternate the wide tile's side, then evenly share the last 1–3 tiles.
// Flex weights account for gutters without hardcoded device dimensions.
export function quickCategoryRows(categories: Category[]): QuickCategoryCell[][] {
  const rows: QuickCategoryCell[][] = [];
  let index = 0;
  while (index < categories.length) {
    const remaining = categories.length - index;
    const count = remaining <= 3 ? remaining : 2;
    const wideOnLeft = rows.length % 2 === 0;
    rows.push(categories.slice(index, index + count).map((category, position) => ({
      category,
      weight: remaining <= 3 ? 1 : (position === (wideOnLeft ? 0 : 1) ? 2 : 1),
    })));
    index += count;
  }
  return rows;
}
