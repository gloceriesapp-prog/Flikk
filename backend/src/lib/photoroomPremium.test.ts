// Admin "Premium background" (Photoroom): request shape, prompts, frame check,
// monthly cap, failure handling and key secrecy
// (apps/admin/src/lib/photoroom.ts, api/product-images/premium/route.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

// The admin app's own sharp (one libvips in the process).
const sharp = createRequire(new URL('../../../apps/admin/package.json', import.meta.url))('sharp') as typeof import('sharp');

const KEY = 'sandbox_sk_test_0123456789abcdef0123456789abcdef';
const PRODUCT = '11111111-1111-4111-8111-111111111111';

// A tiny stand-in for the supabase-js query builder: every chain resolves to
// what `db` says for that table, and writes are recorded.
const db = {
  used: 0,
  cap: 300,
  imageUrl: 'https://images.gloceries.com/products/standard.webp' as string | null,
  jobs: [{ original_url: 'https://images.gloceries.com/products/original.webp', result_url: 'https://images.gloceries.com/products/standard.webp' }],
  attempts: [] as Record<string, unknown>[],
  updates: [] as { table: string; values: Record<string, unknown> }[],
  inserts: [] as { table: string; values: Record<string, unknown> }[],
};
function builder(table: string) {
  let op: 'select' | 'update' | 'insert' = 'select';
  let head = false;
  const result = () => {
    if (op !== 'select') return { data: [{ id: PRODUCT }], error: null };
    if (table === 'product_premium_images') return head ? { count: db.used, error: null } : { data: db.attempts, error: null };
    if (table === 'product_image_jobs') return { data: db.jobs, error: null };
    return { data: [], error: null };
  };
  const single = () => {
    if (table === 'photoroom_settings') return { data: { monthly_cap: db.cap }, error: null };
    if (table === 'products') return { data: { image_url: db.imageUrl }, error: null };
    return { data: null, error: null };
  };
  const q: Record<string, unknown> = {};
  for (const name of ['eq', 'gte', 'not', 'order', 'limit', 'in']) q[name] = () => q;
  q.select = (_: string, options?: { head?: boolean }) => { head = Boolean(options?.head); return q; };
  q.update = (values: Record<string, unknown>) => { op = 'update'; db.updates.push({ table, values }); return q; };
  q.insert = (values: Record<string, unknown>) => { op = 'insert'; db.inserts.push({ table, values }); return q; };
  q.maybeSingle = () => Promise.resolve(single());
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject);
  return q;
}

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => builder(table) } }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => ({ actor: { id: 'a', email: 'a@b.c' }, denied: null }) }));
const stored: Buffer[] = [];
vi.mock('@/features/media/publicImages', () => ({
  storePublicImage: async ({ bytes }: { bytes: Buffer }) => { stored.push(bytes); return { url: 'https://images.gloceries.com/products/premium.webp', assetId: 'x' }; },
}));

const lib = await import('../../../apps/admin/src/lib/photoroom');
const route = await import('../../../apps/admin/src/app/api/product-images/premium/route');

function frame(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#eeeeee' } }).webp().toBuffer();
}

let photoroomCalls: { headers: Headers; body: FormData }[] = [];
let photoroomReply: () => Promise<Response>;
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  process.env.PHOTOROOM_API_KEY = KEY;
  Object.assign(db, { used: 0, cap: 300, imageUrl: 'https://images.gloceries.com/products/standard.webp', attempts: [], updates: [], inserts: [] });
  stored.length = 0;
  photoroomCalls = [];
  photoroomReply = async () => new Response(new Uint8Array(await frame(720, 810)), { status: 200 });
  consoleSpy.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === lib.PHOTOROOM_URL) {
      photoroomCalls.push({ headers: new Headers(init?.headers), body: init?.body as FormData });
      return photoroomReply();
    }
    return new Response(new Uint8Array(await frame(400, 400)), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

function post(body: Record<string, unknown>) {
  return route.POST(new Request('https://admin.test/api/product-images/premium', { method: 'POST', body: JSON.stringify(body) }));
}

describe('request and prompts', () => {
  it('every preset prompt keeps the "no other food or products" rules', () => {
    for (const id of lib.PRESET_IDS) expect(lib.presetPrompt(id, '#AABBCC')).toContain(lib.REQUIRED_PROMPT);
    expect(lib.REQUIRED_PROMPT).toBe('empty surface, no other food, no other products, no text, no logos, no people, soft and minimal, light tones');
    expect(lib.presetPrompt('pastel', '#AABBCC')).toContain('#AABBCC');
  });

  it('asks for exactly 720x810 with the product fitted in the 648x668 safe box, centred', () => {
    const form = lib.editForm(new Blob(['x']), 'marble', null);
    expect(form.get('outputSize')).toBe('720x810');
    expect(form.get('scaling')).toBe('fit');
    expect(form.get('removeBackground')).toBe('true');
    expect(form.get('horizontalAlignment')).toBe('center');
    expect(form.get('verticalAlignment')).toBe('center');
    expect(form.get('ignorePaddingAndSnapOnCroppedSides')).toBe('false');
    expect([form.get('paddingLeft'), form.get('paddingRight'), form.get('paddingTop'), form.get('paddingBottom')]).toEqual(['36px', '36px', '71px', '71px']);
    const { left, right, top, bottom } = lib.SAFE_PADDING;
    expect([lib.FRAME.width - left - right, lib.FRAME.height - top - bottom]).toEqual([648, 668]);
    expect(String(form.get('background.prompt'))).toContain(lib.REQUIRED_PROMPT);
  });

  it('accepts only an exact 720x810 result', async () => {
    await expect(lib.checkFrame(await frame(720, 810))).resolves.toBeUndefined();
    await expect(lib.checkFrame(await frame(720, 720))).rejects.toThrow('not 720x810');
  });

  it('cap and month boundary (India time)', () => {
    expect(lib.capReached(299, 300)).toBe(false);
    expect(lib.capReached(300, 300)).toBe(true);
    // 1 Dec 00:10 IST is still 30 Nov in UTC, but already December's month.
    expect(lib.monthStart(new Date('2026-11-30T18:40:00Z')).toISOString()).toBe('2026-11-30T18:30:00.000Z');
    expect(lib.monthStart(new Date('2026-11-30T18:20:00Z')).toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });
});

describe('premium route', () => {
  it('hides the option without a key, and never calls Photoroom', async () => {
    delete process.env.PHOTOROOM_API_KEY;
    const res = await route.GET(new Request(`https://admin.test/api/product-images/premium?productId=${PRODUCT}`));
    expect((await res.json()).enabled).toBe(false);
    expect((await post({ action: 'generate', productId: PRODUCT, preset: 'studio' })).status).toBe(404);
    expect(photoroomCalls).toHaveLength(0);
  });

  it('only Generate calls Photoroom; reading status, switching and the cap do not', async () => {
    await route.GET(new Request(`https://admin.test/api/product-images/premium?productId=${PRODUCT}`));
    await post({ action: 'use', productId: PRODUCT, attemptId: null });
    await post({ action: 'cap', monthlyCap: 50 });
    expect(photoroomCalls).toHaveLength(0);
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'wood' });
    expect(res.status).toBe(200);
    expect(photoroomCalls).toHaveLength(1);
    expect(photoroomCalls[0].headers.get('x-api-key')).toBe(KEY);
    // Starts from the untouched upload, stores the result, leaves the product alone until "use".
    expect(db.inserts).toEqual([expect.objectContaining({ table: 'product_premium_images', values: expect.objectContaining({ status: 'done', preset: 'wood', url: 'https://images.gloceries.com/products/premium.webp' }) })]);
    expect(db.updates.filter((u) => u.table === 'products')).toHaveLength(1); // only the earlier "use standard"
  });

  it('blocks Generate once the monthly cap is reached', async () => {
    db.used = 300;
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'studio' });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain('Monthly Photoroom limit reached (300 / 300)');
    expect(photoroomCalls).toHaveLength(0);
  });

  it('a Photoroom failure keeps the standard photo and records the reason, without the key', async () => {
    photoroomReply = async () => new Response(JSON.stringify({ error: { message: `bad key ${KEY}` } }), { status: 402 });
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'kitchen' });
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain('credits are used up');
    expect(text).not.toContain(KEY);
    expect(db.updates.filter((u) => u.table === 'products')).toHaveLength(0);
    expect(stored).toHaveLength(0);
    expect(db.inserts[0].values).toMatchObject({ status: 'failed', url: null });
    expect(JSON.stringify(db.inserts)).not.toContain(KEY);
  });

  it('a wrong-size result is not used, and errors never log the key', async () => {
    photoroomReply = async () => new Response(new Uint8Array(await frame(1024, 1024)), { status: 200 });
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'coastal' });
    expect(res.status).toBe(502);
    expect(stored).toHaveLength(0);
    photoroomReply = async () => { throw new Error(`socket closed for ${KEY}`); };
    await post({ action: 'generate', productId: PRODUCT, preset: 'studio' });
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain(KEY);
  });

  it('switching to a premium photo only replaces this product\'s own photos', async () => {
    db.attempts = [{ id: '22222222-2222-4222-8222-222222222222', preset: 'marble', color: null, status: 'done', url: 'https://images.gloceries.com/products/premium.webp', error: null, standard_url: null, created_at: '2026-11-22T00:00:00Z' }];
    const res = await post({ action: 'use', productId: PRODUCT, attemptId: '22222222-2222-4222-8222-222222222222' });
    expect(res.status).toBe(200);
    expect((await res.json()).imageUrl).toBe('https://images.gloceries.com/products/premium.webp');
    expect(db.updates).toEqual([{ table: 'products', values: { image_url: 'https://images.gloceries.com/products/premium.webp' } }]);
  });
});
