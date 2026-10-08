import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const db = vi.hoisted(() => ({ tables: {} as Record<string, { data: unknown; error: unknown }>, filters: [] as unknown[][] }));
vi.mock('../db/supabase.js', () => ({
  supabase: {
    from: (table: string) => {
      const result = () => db.tables[table] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'order', 'limit']) chain[m] = () => chain;
      chain.eq = (...args: unknown[]) => { db.filters.push([table, ...args]); return chain; };
      chain.maybeSingle = async () => result();
      chain.then = (resolve: (v: unknown) => void) => resolve(result());
      return chain;
    },
  },
}));

import { appConfigRouter, toFaqs, toRelease } from './appConfig.js';
import { compareVersions, parseRelease, releaseGate } from '../../../packages/shared/src/release/index';
import { validateFaqInput, validateReleaseInput } from '../../../apps/admin/src/lib/appSettingsValidation';

let server: Server;
let base = '';
beforeAll(async () => {
  const app = express();
  app.use('/app-config', appConfigRouter);
  app.use((err: { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status ?? 500).json({ code: err.code });
  });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { db.tables = {}; db.filters = []; });

const releaseRow = { app: 'rider', min_supported_version: '1.2.0', latest_version: '1.3.0', ios_store_url: 'https://apps.apple.com/x',
  android_store_url: 'http://insecure', force_update: false, maintenance_enabled: true, maintenance_message: ' Back at 6 ' };

describe('GET /app-config', () => {
  it('serves content, the customer release gate and active FAQs', async () => {
    db.tables = {
      app_content: { data: { about_title: 'About' }, error: null },
      app_release_config: { data: { ...releaseRow, app: 'customer', maintenance_enabled: false }, error: null },
      app_faqs: { data: [{ id: 'a', question: ' Q? ', answer: ' A. ' }, { id: 'b', question: ' ', answer: 'x' }], error: null },
    };
    const res = await fetch(`${base}/app-config`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.about.title).toBe('About');
    expect(body.release).toMatchObject({ minSupportedVersion: '1.2.0', latestVersion: '1.3.0', androidStoreUrl: null, maintenance: { enabled: false } });
    expect(body.faqs).toEqual([{ id: 'a', question: 'Q?', answer: 'A.' }]);
    expect(db.filters).toContainEqual(['app_release_config', 'app', 'customer']);
    expect(db.filters).toContainEqual(['app_faqs', 'is_active', true]);
  });
  it('degrades to no gate and no FAQ when those tables are unavailable, but 503s without content', async () => {
    db.tables = { app_release_config: { data: null, error: { code: '42P01' } }, app_faqs: { data: null, error: { code: '42P01' } } };
    const body = await (await fetch(`${base}/app-config`)).json();
    expect(body.release).toEqual(toRelease(null));
    expect(body.faqs).toEqual([]);
    db.tables.app_content = { data: null, error: { code: 'XX000' } };
    expect((await fetch(`${base}/app-config`)).status).toBe(503);
  });
});

describe('GET /app-config/release/:app', () => {
  it('serves partner and rider gates without auth and refuses unknown apps', async () => {
    db.tables = { app_release_config: { data: releaseRow, error: null } };
    const body = await (await fetch(`${base}/app-config/release/rider`)).json();
    expect(body).toEqual({ minSupportedVersion: '1.2.0', latestVersion: '1.3.0', iosStoreUrl: 'https://apps.apple.com/x', androidStoreUrl: null,
      forceUpdate: false, maintenance: { enabled: true, message: 'Back at 6' } });
    expect(db.filters).toContainEqual(['app_release_config', 'app', 'rider']);
    expect((await fetch(`${base}/app-config/release/admin`)).status).toBe(404);
  });
});

describe('release gate', () => {
  const release = (patch = {}) => parseRelease({ ...toRelease({ ...releaseRow, maintenance_enabled: false }), ...patch });
  it('compares dotted versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('garbage', '9.9.9')).toBe(0);
  });
  it('blocks below the minimum, offers an update below latest, and passes otherwise', () => {
    expect(releaseGate(release(), '1.1.9', 'ios')).toEqual({ kind: 'update-required', storeUrl: 'https://apps.apple.com/x' });
    expect(releaseGate(release(), '1.2.5', 'android')).toEqual({ kind: 'update-available', latestVersion: '1.3.0', storeUrl: null });
    expect(releaseGate(release(), '1.3.0', 'ios')).toEqual({ kind: 'ok' });
    expect(releaseGate(null, '0.0.1', 'ios')).toEqual({ kind: 'ok' });
    expect(releaseGate(release(), undefined, 'ios')).toEqual({ kind: 'ok' });
  });
  it('force update requires the latest version; maintenance wins over everything', () => {
    expect(releaseGate(release({ forceUpdate: true }), '1.2.5', 'ios').kind).toBe('update-required');
    expect(releaseGate(release({ maintenance: { enabled: true, message: null } }), '9.9.9', 'ios'))
      .toMatchObject({ kind: 'maintenance', message: expect.stringContaining('improvements') });
  });
});

describe('admin App settings validation', () => {
  const ok = { app: 'customer', minSupportedVersion: '1.0.0', latestVersion: '1.1.0', androidStoreUrl: 'https://play.google.com/x' };
  it('accepts a valid release and normalises blanks', () => {
    expect(validateReleaseInput({ ...ok, iosStoreUrl: ' ', maintenanceMessage: ' ' })).toMatchObject({
      app: 'customer', min_supported_version: '1.0.0', ios_store_url: null, maintenance_message: null, force_update: false });
  });
  it.each([
    { app: 'admin' }, { minSupportedVersion: '1.x' }, { minSupportedVersion: '2.0.0' }, { androidStoreUrl: 'http://x' },
    { androidStoreUrl: '', iosStoreUrl: '' }, { maintenanceMessage: 'x'.repeat(501) },
  ])('rejects %o', (patch) => expect(() => validateReleaseInput({ ...ok, ...patch })).toThrow());
  it('validates FAQs', () => {
    expect(validateFaqInput({ question: ' Q ', answer: ' A ', sortOrder: 2 })).toEqual({ question: 'Q', answer: 'A', sort_order: 2, is_active: true });
    expect(() => validateFaqInput({ question: '', answer: 'A' })).toThrow();
    expect(() => validateFaqInput({ question: 'Q', answer: 'A', sortOrder: 1.5 })).toThrow();
  });
  it('returns FAQ rows trimmed', () => expect(toFaqs(null)).toEqual([]));
});
