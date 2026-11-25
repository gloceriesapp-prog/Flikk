import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ fetchRoute: vi.fn(), claim: vi.fn(), rows: [] as Record<string, unknown>[] }));
vi.mock('../config/env.js', () => ({ env: { googleRoutesApiKey: 'key' } }));
vi.mock('../customer-experience/mapsBudget.js', () => ({ claimMapsBudget: m.claim }));
vi.mock('../lib/routeDirections.js', () => ({ fetchRoute: m.fetchRoute }));
// A tiny delivery_routes table: eq filters, maybeSingle, update, upsert.
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => {
  const filters: [string, unknown][] = [];
  let patch: Record<string, unknown> | null = null;
  const match = () => m.rows.filter(row => filters.every(([k, v]) => row[k] === v));
  const builder = {
    select: () => builder,
    eq: (k: string, v: unknown) => { filters.push([k, v]); return builder; },
    update: (p: Record<string, unknown>) => { patch = p; return builder; },
    upsert: async (row: Record<string, unknown>) => {
      if (!m.rows.some(r => r.order_id === row.order_id && r.leg === row.leg)) m.rows.push({ ...row });
      return { error: null };
    },
    maybeSingle: async () => {
      const rows = match();
      if (patch) rows.forEach(row => Object.assign(row, patch));
      return { data: rows[0] ?? null, error: null };
    },
    then: (resolve: (v: unknown) => unknown) => {
      if (patch) match().forEach(row => Object.assign(row, patch));
      return Promise.resolve({ error: null }).then(resolve);
    },
  };
  return builder;
} } }));

import { legRoute, MAX_REROUTES, REROUTE_GAP_MS, metersFromPath } from './legRoutes.js';

const store = { latitude: 13.34, longitude: 74.74 };
const home = { latitude: 13.35, longitude: 74.75 };
const road = [store, { latitude: 13.34, longitude: 74.75 }, home];
let clock = Date.parse('2026-11-26T10:00:00Z');
const at = (s = 0) => new Date(clock + s * 1000).toISOString();
const fix = (point: { latitude: number; longitude: number }, s: number) => ({ point, at: at(s) });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(clock);
  m.rows.length = 0;
  m.claim.mockReset().mockResolvedValue(0);
  m.fetchRoute.mockReset().mockImplementation(async (origin: typeof store) => ({ points: [origin, ...road.slice(1)], durationSec: 300, distanceM: 2000 }));
});
afterEach(() => { vi.useRealTimers(); clock += 10 * 60_000; });

it('works a leg out once and shares it: reopening and other viewers are free', async () => {
  const first = await legRoute('o1', 'drop', store, home, null);
  expect(first).toMatchObject({ leg: 'drop', version: 1, distanceM: 2000, durationS: 300 });
  await legRoute('o1', 'drop', { latitude: 13.341, longitude: 74.745 }, home, null);
  await legRoute('o1', 'drop', store, home, null, false);
  expect(m.fetchRoute).toHaveBeenCalledOnce();
  // The pickup leg is its own route.
  await legRoute('o1', 'pickup', { latitude: 13.33, longitude: 74.73 }, store, null);
  expect(m.fetchRoute).toHaveBeenCalledTimes(2);
});

it('a light check never creates a route', async () => {
  expect(await legRoute('o2', 'drop', store, home, null, false)).toBeNull();
  expect(m.fetchRoute).not.toHaveBeenCalled();
});

it('re-routes only after two off-road fixes in a row, a minute apart, capped per leg', async () => {
  await legRoute('o3', 'drop', store, home, null);
  const away = (n: number) => ({ latitude: 13.33 - n * 0.001, longitude: 74.74 });
  vi.advanceTimersByTime(REROUTE_GAP_MS);

  // On the road: nothing happens.
  await legRoute('o3', 'drop', null, home, fix({ latitude: 13.34, longitude: 74.745 }, 60));
  // One stray point off the road: not yet.
  await legRoute('o3', 'drop', null, home, fix(away(0), 65));
  expect(m.fetchRoute).toHaveBeenCalledOnce();
  // The same fix polled again by another viewer counts once.
  await legRoute('o3', 'drop', null, home, fix(away(0), 65));
  expect(m.fetchRoute).toHaveBeenCalledOnce();
  // Second fix in a row off the road: a fresh route from there, version 2.
  const rerouted = await legRoute('o3', 'drop', null, home, fix(away(1), 70));
  expect(m.fetchRoute).toHaveBeenCalledTimes(2);
  expect(rerouted?.version).toBe(2);
  expect(rerouted?.points[0]).toEqual(away(1));

  // Further re-routes need the gap, and stop at the cap.
  let s = 70;
  for (let n = 2; n < 12; n += 1) {
    vi.advanceTimersByTime(REROUTE_GAP_MS);
    s += 60;
    await legRoute('o3', 'drop', null, home, fix({ latitude: 13.30 - n * 0.002, longitude: 74.70 }, s));
    await legRoute('o3', 'drop', null, home, fix({ latitude: 13.30 - n * 0.002 - 0.0005, longitude: 74.70 }, s + 5));
  }
  expect(m.fetchRoute).toHaveBeenCalledTimes(1 + MAX_REROUTES);
});

it('keeps the route when Google is unavailable and backs off', async () => {
  m.claim.mockResolvedValue(30);
  expect(await legRoute('o4', 'drop', store, home, null)).toBeNull();
  m.claim.mockResolvedValue(0);
  expect(await legRoute('o4', 'drop', store, home, null)).toBeNull();
  expect(m.fetchRoute).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(await legRoute('o4', 'drop', store, home, null)).toMatchObject({ version: 1 });
});

it('measures distance from a point to the road', () => {
  expect(metersFromPath({ latitude: 13.34, longitude: 74.745 }, road)).toBeLessThan(1);
  expect(metersFromPath({ latitude: 13.341, longitude: 74.745 }, road)).toBeGreaterThan(100);
});
