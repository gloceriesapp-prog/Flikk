import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { startServer, startupMessage } from './lifecycle.js';
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanup.splice(0).map(stop => stop())); });
it('handles an occupied port without starting jobs or subscriptions', async () => {
  const occupied = createServer();
  await new Promise<void>(resolve => occupied.listen(0, resolve));
  cleanup.push(() => new Promise<void>(resolve => occupied.close(() => resolve())));
  const address = occupied.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  const start = vi.fn();
  await expect(startServer((_req, res) => res.end(), address.port, start)).rejects.toMatchObject({ code: 'EADDRINUSE' });
  expect(start).not.toHaveBeenCalled();
  expect(startupMessage({ code: 'EADDRINUSE' }, address.port)).toContain('already in use');
});
it('starts jobs only after bind and cleans up exactly once across repeated shutdown', async () => {
  const stop = vi.fn(async () => {});
  const start = vi.fn(() => stop);
  const runtime = await startServer((_req, res) => res.end(), 0, start);
  cleanup.push(runtime.stop);
  expect(runtime.server.listening).toBe(true);
  expect(start).toHaveBeenCalledTimes(1);
  await Promise.all([runtime.stop(), runtime.stop()]);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(runtime.server.listening).toBe(false);
});
it('releases the bound port when background startup fails', async () => {
  await expect(startServer((_req, res) => res.end(), 0, () => { throw new Error('startup failed'); })).rejects.toThrow('startup failed');
});
it('reports permission and other startup failures clearly', () => {
  expect(startupMessage({ code: 'EACCES' }, 80)).toContain('Permission denied');
  expect(startupMessage(new Error('broken'), 4000)).toContain('broken');
});
