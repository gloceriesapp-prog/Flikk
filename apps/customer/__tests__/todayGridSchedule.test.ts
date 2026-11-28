import { scheduleGrid } from '../src/screens/home/today-grid/scheduleGrid';

const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const TUESDAY = '2026-12-15';
const ids = (g: ReturnType<typeof scheduleGrid>) => g.cards.map((c) => c.id);

it.each([
  ['07:30', 'morning', 'todays-catch'], ['10:00', 'late-morning', 'todays-catch'], ['14:00', 'afternoon', 'village-fresh'],
  ['17:30', 'evening', 'veg-for-tomorrow'], ['20:30', 'night', 'veg-for-tomorrow'], ['23:00', 'late-night', 'fresh-by-7'], ['03:00', 'late-night', 'fresh-by-7'],
])('%s IST shows the %s hero %s and 4 cards', (time, slot, hero) => {
  const grid = scheduleGrid(ist(TUESDAY, time));
  expect([grid.slot, grid.hero.id]).toEqual([slot, hero]);
  expect(grid.cards).toHaveLength(4);
  expect(new Set(ids(grid)).size).toBe(4);
});

it('never shows personal cards or a number it does not have', () => {
  for (const time of ['07:30', '10:00', '14:00', '17:30', '20:30', '23:00']) {
    const grid = scheduleGrid(ist(TUESDAY, time));
    expect(ids(grid)).not.toContain('your-usuals');
    expect(ids(grid)).not.toContain('offers-for-you');
    for (const card of [grid.hero, ...grid.cards]) {
      expect(card.tag).not.toMatch(/[{}]/);
      expect(card.imageUrls).toEqual([]);
      expect(card.price).toBeUndefined();
    }
  }
});

it('applies the same modifiers as the server (month start, weekend party)', () => {
  expect(ids(scheduleGrid(ist('2026-12-03', '07:30')))).toContain('glo-bulk');
  expect(ids(scheduleGrid(ist('2026-12-17', '17:30')))).toContain('party-orders'); // Thursday evening
});

it('refreshes exactly at the next slot edge', () => {
  expect(scheduleGrid(ist(TUESDAY, '07:30')).refreshAt).toBe(ist(TUESDAY, '09:00').toISOString());
  expect(scheduleGrid(ist(TUESDAY, '23:00')).refreshAt).toBe(ist('2026-12-16', '06:00').toISOString());
});
