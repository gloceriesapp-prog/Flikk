import { quickCategoryRows } from '../src/screens/home/quick-categories/layout';
import type { Category } from '../src/screens/home/data/categoryTabs';

const cats = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, label: `C${i}` }) as unknown as Category);
const shape = (n: number) => quickCategoryRows(cats(n)).map((row) => row.map((cell) => cell.weight).join(''));

test('rows of three, with one or two wide+small feature rows for the remainder', () => {
  expect(shape(0)).toEqual([]);
  expect(shape(2)).toEqual(['11']);
  expect(shape(3)).toEqual(['111']);
  expect(shape(4)).toEqual(['21', '12']);
  expect(shape(5)).toEqual(['21', '111']);
  expect(shape(6)).toEqual(['111', '111']);
  expect(shape(7)).toEqual(['21', '12', '111']);
  expect(shape(8)).toEqual(['21', '111', '111']);
  expect(shape(9)).toEqual(['111', '111', '111']);
});

test('every category appears once, in order', () => {
  for (let n = 1; n <= 10; n++) {
    expect(quickCategoryRows(cats(n)).flat().map((cell) => cell.category.id)).toEqual(cats(n).map((c) => c.id));
  }
});
