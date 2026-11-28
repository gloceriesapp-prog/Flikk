import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ stores: vi.fn(), live: vi.fn(), user: vi.fn(), config: { value: { enabled: true, config: {} } as unknown } }));
vi.mock('../customer-experience/browse.js', () => ({ deliveryStores: m.stores }));
vi.mock('./availability.js', () => ({ nearbyAvailability: m.live, customerSummary: m.user }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => {
  const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: m.config.value, error: null }) }; return q; } } }));
import { todayGridRouter } from './route.js';
import { EMPTY_STAT } from '../../../packages/today-grid/index.js';

const stat = { count: 5, minPrice: 20, minPriceMrp: 25, maxDiscountPct: 20, imageUrls: ['https://img/a'] };
const availability = { openStores: 1, categories: { 'Snacks': stat }, fish: { ...EMPTY_STAT, arrivedMinute: null }, villagePickedToday: EMPTY_STAT,
  vegetables: EMPTY_STAT, fruitsAndVegetables: stat, preorder: { open: false, cutoffMinute: null }, bulk: EMPTY_STAT, party: EMPTY_STAT,
  popularThisWeek: stat, brands: stat };

async function get(query: Record<string, string>) {
  const layer = (todayGridRouter as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: unknown, res: unknown, next: () => void) => unknown }[] } }[] }).stack
    .find(l => l.route?.path === '/' && l.route.methods.get)!.route!;
  const res = { body: undefined as unknown, headers: {} as Record<string, string>, json(b: unknown) { this.body = b; return this; }, setHeader(k: string, v: string) { this.headers[k] = v; } };
  const next = vi.fn();
  const req = { query, headers: {} };
  for (const { handle } of layer.stack) await new Promise<void>(resolve => { const r = handle(req, res, () => resolve()); if (r instanceof Promise) r.then(() => resolve()); });
  return { res, next };
}
beforeEach(() => {
  vi.resetAllMocks();
  m.config.value = { enabled: true, config: {} };
  m.stores.mockResolvedValue(['s1']);
  m.live.mockResolvedValue({ availability, products: [], ranked: [] });
  m.user.mockResolvedValue({ kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] });
});
it('returns hero, cards, slot and generatedAt, uncached', async () => {
  const { res } = await get({ lat: '13.3', lng: '74.7' });
  const body = res.body as { enabled: boolean; hero: { id: string; title: string; tagBg: string }; cards: { id: string; target: unknown }[]; slot: string; generatedAt: string };
  expect(body.enabled).toBe(true);
  expect(body.hero).toMatchObject({ title: expect.any(String), tagBg: expect.stringMatching(/^#/) });
  expect(Array.isArray(body.cards)).toBe(true);
  for (const card of body.cards) expect(card).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), tag: expect.any(String), line: expect.any(String), accent: expect.any(String), tagBg: expect.any(String), imageUrls: expect.any(Array), target: expect.any(Object) }));
  expect(typeof body.slot).toBe('string');
  expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
  expect(res.headers['Cache-Control']).toBe('private, no-store');
  expect(m.user).toHaveBeenCalledWith(null, [], []);
});
it('is empty when switched off or with no shops nearby', async () => {
  m.config.value = { enabled: false, config: {} };
  expect((await get({ lat: '1', lng: '1' })).res.body).toMatchObject({ enabled: false, cards: [] });
  m.config.value = { enabled: true, config: {} }; m.stores.mockResolvedValue([]);
  expect((await get({})).res.body).toMatchObject({ enabled: false, hero: null });
});
