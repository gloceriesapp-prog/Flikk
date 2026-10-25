import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
import { storesRouter } from './stores.js';

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use('/stores', storesRouter);
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status ?? 500).json({ error: 'discovery failed' });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: [{ store: { id: 'closed', name: 'Closed test store', is_active: false,
    owner_user_id: 'private-owner', bank_account_number: 'synthetic-private-value' }, distance_km: 1.25 }], error: null });
});

it.each(['', '/nearest'])('keeps closed stores discoverable at /stores%s without exposing merchant fields', async path => {
  const response = await fetch(`${base}/stores${path}?lat=13&lng=74`);
  expect(response.status).toBe(200);
  const rows = await response.json();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ id: 'closed', is_active: false });
  expect(rows[0]).not.toHaveProperty('owner_user_id');
  expect(rows[0]).not.toHaveProperty('bank_account_number');
  if (path) expect(rows[0].distance_km).toBe(1.25);
  expect(rpc).toHaveBeenCalledWith('nearby_browsable_stores', expect.objectContaining({ p_lat: 13, p_lng: 74, p_max_km: null }));
});

it('keeps closed-store coverage serviceable without declaring the store orderable', async () => {
  const response = await fetch(`${base}/stores/serviceability?lat=13&lng=74`);
  expect(await response.json()).toEqual({ serviceable: true, nearestDistanceKm: 1.25 });
  expect(rpc).toHaveBeenCalledWith('nearby_browsable_stores', expect.objectContaining({ p_limit: 1 }));
});

it('does not invent coverage when no eligible store is returned', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  expect(await (await fetch(`${base}/stores/serviceability?lat=13&lng=74`)).json())
    .toEqual({ serviceable: false, nearestDistanceKm: null });
});
