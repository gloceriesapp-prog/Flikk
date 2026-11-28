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
  expect(screen.getByText('Landed')).toBeTruthy();
  expect(screen.getByText('6:40 AM')).toBeTruthy();
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

it('no sub heading on any card: titles only', async () => {
  await render(<TodayGridView headerImageUrl="https://img/header" grid={grid(4)} onTap={jest.fn()} />);
  expect(screen.queryByText('line')).toBeNull();
});

it('skeleton keeps the same layout', async () => {
  await render(<TodayGridSkeleton />);
  expect(screen.getByTestId('today-grid-skeleton')).toBeTruthy();
});

it('splits tags into the two-tone pill', () => {
  const { tagParts } = jest.requireActual('../src/screens/home/today-grid/tagParts') as typeof import('../src/screens/home/today-grid/tagParts');
  expect(tagParts('Up to 33% off')).toEqual({ lead: 'Up to', value: '33% OFF' });
  expect(tagParts('From ₹20')).toEqual({ lead: 'From', value: '₹20' });
  expect(tagParts('Landed 6:40 AM')).toEqual({ lead: 'Landed', value: '6:40 AM' });
  expect(tagParts('Order by 10 PM')).toEqual({ lead: 'Order by', value: '10 PM' });
  expect(tagParts('Local makers')).toEqual({ lead: null, value: 'Local makers' });
});

it('hero slides through its products right to left, looping back to the first', async () => {
  const { act } = jest.requireActual('@testing-library/react-native') as typeof import('@testing-library/react-native');
  const g = grid(4);
  const products = [
    { id: 'a', name: 'Seer Fish', price: 599, mrp: 1295, imageUrl: 'https://img/a' },
    { id: 'b', name: 'Prawns', price: 320, mrp: null, imageUrl: 'https://img/b' },
  ];
  await render(<TodayGridView headerImageUrl="https://img/header" grid={{ ...g, hero: { ...g.hero, products } }} onTap={jest.fn()} />);
  // Slides side by side + a copy of the first at the end for the loop.
  expect(screen.getAllByText('Seer Fish')).toHaveLength(2);
  expect(screen.getAllByText('Prawns')).toHaveLength(1);
  expect(screen.getAllByText('₹1,295')).toHaveLength(2); // MRP only on the product that has a real one
  const { Animated } = jest.requireActual('react-native') as typeof import('react-native');
  const timing = jest.spyOn(Animated, 'timing');
  await act(async () => { jest.advanceTimersByTime(3000); });
  const toValue = (timing.mock.calls.at(-1)![1] as { toValue: number }).toValue;
  expect(toValue).toBeLessThan(0); // one card width to the left: the next product comes in from the right
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect((timing.mock.calls.at(-1)![1] as { toValue: number }).toValue).toBe(toValue * 2); // on to the loop copy of the first
  timing.mockRestore();
});

it('header keeps the image’s own shape (no banner clamp), ignoring broken sizes', () => {
  const { headerRatio } = jest.requireActual('../src/screens/home/today-grid/components/TodayGridView') as typeof import('../src/screens/home/today-grid/components/TodayGridView');
  expect(headerRatio(1200, 400)).toBe(3);
  expect(headerRatio(1600, 200)).toBe(8); // wide strip stays wide
  expect(headerRatio(800, 800)).toBe(1);
  expect(headerRatio(0, 400)).toBeNull();
});
