import type { Category } from '../data/categoryTabs';

export interface QuickCategoryCell {
  category: Category;
  weight: number;
}

// Rows of three equal tiles, with the leftover one or two categories shown
// first as "feature" rows of a wide tile plus a small one (wide side
// alternating):
//   1–3 → one even row        6, 9 → 3 + 3 (+ 3)
//   5, 8 → 2 + 3 (+ 3)        4, 7 → 2 + 2 (+ 3)
// Flex weights account for gutters without hardcoded device dimensions.
export function quickCategoryRows(categories: Category[]): QuickCategoryCell[][] {
  const total = categories.length;
  if (total === 0) return [];
  if (total <= 3) return [categories.map((category) => ({ category, weight: 1 }))];

  const remainder = total % 3;
  const featureRows = remainder === 0 ? 0 : remainder === 2 ? 1 : 2;
  const rows: QuickCategoryCell[][] = [];
  let index = 0;
  for (let row = 0; row < featureRows; row++) {
    const wideOnLeft = row % 2 === 0;
    rows.push(categories.slice(index, index + 2).map((category, position) => ({
      category,
      weight: position === (wideOnLeft ? 0 : 1) ? 2 : 1,
    })));
    index += 2;
  }
  for (; index < total; index += 3) {
    rows.push(categories.slice(index, index + 3).map((category) => ({ category, weight: 1 })));
  }
  return rows;
}
