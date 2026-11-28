import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ stores: vi.fn(), live: vi.fn(), user: vi.fn(), grid: vi.fn(), festival: vi.fn() }));
vi.mock('../customer-experience/browse.js', () => ({ deliveryStores: m.stores, hydrateBrowse: vi.fn() }));
vi.mock('./availability.js', () => ({ nearbyAvailability: m.live, customerSummary: m.user }));
vi.mock('./gridState.js', () => ({ readPublishedGrid: m.grid, readFestival: m.festival }));
import { gridResponse, todayGridRouter } from './route.js';
import { buildTodayGrid, DEFAULT_CONFIG } from '../../../packages/today-grid/index.js';
import { availability, GUEST, NO_FESTIVAL } from './fixtures.js';

async function get(query: Record<string, string>) {
  const layer = (todayGridRouter as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: unknown, res: unknown, next: () => void) => unknown }[] } }[] }).stack
    .find(l => l.route?.path === '/' && l.route.methods.get)!.route!;
  const res = { body: undefined as unknown, headers: {} as Record<string, string>, json(b: unknown) { this.body = b; return this; }, setHeader(k: string, v: string) { this.headers[k] = v; } };
  for (const { handle } of layer.stack) await new Promise<void>(resolve => { const r = handle({ query, headers: {} }, res, () => resolve()); if (r instanceof Promise) r.then(() => resolve()); });
  return res;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.grid.mockResolvedValue({ enabled: true, config: DEFAULT_CONFIG, versionId: 7 });
  m.festival.mockResolvedValue(NO_FESTIVAL);
  m.stores.mockResolvedValue(['s1']);
  m.live.mockResolvedValue({ availability: availability(), products: [], ranked: [] });
  m.user.mockResolvedValue(GUEST);
});
it('returns exactly what the shared engine (the admin preview) computes for the same inputs', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-15T02:00:00Z'));
  try {
    const res = await get({ lat: '13.3', lng: '74.7' });
    const body = res.body as Record<string, unknown>;
    const now = new Date('2026-12-15T02:00:00Z');
    const preview = buildTodayGrid({ now, user: GUEST, availability: availability(), config: DEFAULT_CONFIG, festival: NO_FESTIVAL });
    expect({ hero: body.hero, cards: body.cards, slot: body.slot, refreshAt: body.refreshAt })
      .toEqual({ hero: preview.hero, cards: preview.cards, slot: preview.slot, refreshAt: preview.refreshAt });
    expect(gridResponse({ now, user: GUEST, availability: availability(), config: DEFAULT_CONFIG, festival: NO_FESTIVAL })).not.toHaveProperty('trace');
    expect(res.headers['Cache-Control']).toBe('private, no-store');
  } finally { vi.useRealTimers(); }
});
it('is empty when switched off or with no shops nearby', async () => {
  m.grid.mockResolvedValue({ enabled: false, config: DEFAULT_CONFIG, versionId: 7 });
  expect((await get({ lat: '1', lng: '1' })).body).toMatchObject({ enabled: false, cards: [] });
  m.grid.mockResolvedValue({ enabled: true, config: DEFAULT_CONFIG, versionId: 7 }); m.stores.mockResolvedValue([]);
  expect((await get({})).body).toMatchObject({ enabled: false, hero: null });
});
