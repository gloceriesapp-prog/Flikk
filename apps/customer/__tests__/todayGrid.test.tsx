import { fireEvent, render, screen } from '@testing-library/react-native';
import { TodayGridView } from '../src/screens/home/today-grid/components/TodayGridView';
import { TodayGridSkeleton } from '../src/screens/home/today-grid/components/TodayGridSkeleton';
import { gridShape } from '../src/screens/home/today-grid/layout';
import { resetGridAnalytics } from '../src/screens/home/today-grid/analytics';
import type { GridCard, TodayGrid } from '../src/screens/home/today-grid/api';

jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
const mockPost = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/screens/home/today-grid/api', () => ({ postGridEvents: (...args: unknown[]) => mockPost(...args) }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

const card = (id: string, patch: Partial<GridCard> = {}): GridCard => ({ id: id as GridCard['id'], title: id, tag: 'From ₹10', line: 'line', accent: '#155DFC', tagBg: '#155DFC',
  tagText: '#FFFFFF', imageUrls: ['https://img/a'], target: { type: 'categories', categories: ['Snacks'] }, ...patch });
const hero = card('todays-catch', { title: "Today's Catch", tag: 'Landed 6:40 AM', tagBg: '#0B1F4D', tagText: '#FFD84D', price: { amount: 180, mrp: 220 } });
const grid = (n: number): TodayGrid & { hero: GridCard } => ({ enabled: true, hero, slot: 'morning', generatedAt: '2026-12-15T02:00:00Z',
  cards: ['milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee'].slice(0, n).map(id => card(id)) });

beforeEach(() => { resetGridAnalytics(); jest.useFakeTimers(); mockPost.mockClear(); });
afterEach(() => jest.useRealTimers());

it('picks a clean shape for any number of cards', () => {
  expect(gridShape(4)).toEqual({ shape: 'full', cards: 4 });
  expect(gridShape(3)).toEqual({ shape: 'row', cards: 2 });
  expect(gridShape(2)).toEqual({ shape: 'row', cards: 2 });
  expect(gridShape(1)).toEqual({ shape: 'hero-only', cards: 0 });
  expect(gridShape(0)).toEqual({ shape: 'hero-only', cards: 0 });
});

it.each([[4, 'full', 4], [3, 'row', 2], [0, 'hero-only', 0]])('%i cards render the %s layout with the hero', async (n, shape, visible) => {
  await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(n)} onTap={jest.fn()} />);
  expect(screen.getByLabelText('Today on Gloceries')).toBeTruthy();
  expect(screen.getByTestId(`today-grid-${shape}`)).toBeTruthy();
  expect(screen.getByTestId('today-hero')).toBeTruthy();
  expect(screen.queryAllByTestId(/^today-card-/)).toHaveLength(visible);
});

it('shows honest hero numbers: price and real MRP struck', async () => {
  await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={jest.fn()} />);
  expect(screen.getByText('Landed 6:40 AM')).toBeTruthy();
  expect(screen.getByText('₹180')).toBeTruthy();
  expect(screen.getByText('₹220')).toBeTruthy();
});

it('taps report the card and its position', async () => {
  const onTap = jest.fn();
  await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={onTap} />);
  await fireEvent.press(screen.getByTestId('today-card-breakfast-ready'));
  expect(onTap).toHaveBeenCalledWith(expect.objectContaining({ id: 'breakfast-ready' }), 3);
});

it('logs one impression per card per session', async () => {
  const view = await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={jest.fn()} />);
  await view.rerender(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={jest.fn()} />);
  jest.advanceTimersByTime(3_500);
  const events = mockPost.mock.calls.flatMap(([batch]) => batch as { type: string; cardId: string }[]);
  expect(events.filter(e => e.type === 'impression').map(e => e.cardId)).toEqual(['todays-catch', 'milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee']);
});

it('a card or hero without photos gets stand-in product photos, never an empty foot', async () => {
  const g = grid(4);
  await render(<TodayGridView headerImageUrl="https://img/header" grid={{ ...g, hero: { ...g.hero, imageUrls: [] }, cards: g.cards.map((c, i) => (i ? c : { ...c, imageUrls: [] })) }} onTap={jest.fn()} />);
  const stand = screen.getAllByTestId('today-photo').filter((n) => String(n.props.source?.uri).startsWith('https://images.gloceries.com/products/'));
  expect(stand).toHaveLength(3); // hero: 1, first card: 2
});

it('small cards show the title only; the line stays on the hero', async () => {
  await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={jest.fn()} />);
  expect(screen.getAllByText('line')).toHaveLength(1);
});

it('skeleton keeps the same layout', async () => {
  await render(<TodayGridSkeleton />);
  expect(screen.getByTestId('today-grid-skeleton')).toBeTruthy();
});
