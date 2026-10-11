import { expect, it } from 'vitest';
import { WORKER_HEARTBEAT_STALE_MS, workerHealthFromHeartbeat } from './workerHealth.js';

const now = 1_000_000_000_000;

it('reports a fresh heartbeat as healthy with its age', () => {
  const h = workerHealthFromHeartbeat(now - 30_000, now);
  expect(h).toEqual({ healthy: true, ageSeconds: 30, warn: false });
});

it('reports a stale heartbeat as unhealthy and warns', () => {
  const h = workerHealthFromHeartbeat(now - (WORKER_HEARTBEAT_STALE_MS + 60_000), now);
  expect(h.healthy).toBe(false);
  expect(h.warn).toBe(true);
  expect(h.ageSeconds).toBe((WORKER_HEARTBEAT_STALE_MS + 60_000) / 1000);
});

it('treats a never-run worker as unhealthy but does not warn (startup window)', () => {
  expect(workerHealthFromHeartbeat(null, now)).toEqual({ healthy: false, ageSeconds: null, warn: false });
  expect(workerHealthFromHeartbeat(NaN, now)).toEqual({ healthy: false, ageSeconds: null, warn: false });
});

it('is healthy exactly at the threshold and stale just past it', () => {
  expect(workerHealthFromHeartbeat(now - WORKER_HEARTBEAT_STALE_MS, now).healthy).toBe(true);
  expect(workerHealthFromHeartbeat(now - WORKER_HEARTBEAT_STALE_MS - 1, now).healthy).toBe(false);
});

it('clamps a future heartbeat to age 0 rather than reporting negative', () => {
  expect(workerHealthFromHeartbeat(now + 5_000, now)).toEqual({ healthy: true, ageSeconds: 0, warn: false });
});
