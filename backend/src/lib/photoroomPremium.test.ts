// Admin "Premium background" (Photoroom): request shape, prompts and the
// fixed safety text, category presets, placement (gallery / main), frame
// check, monthly cap, failure handling and key secrecy
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
  extras: [] as string[],
  category: 'Spices & Masala' as string | null,
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
    if (table === 'products') return { data: { image_url: db.imageUrl, extra_image_urls: db.extras, category: db.category }, error: null };
    return { data: null, error: null };
  };
  const q: Record<string, unknown> = {};
  for (const name of ['eq', 'gte', 'not', 'order', 'limit', 'in', 'is']) q[name] = () => q;
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
  Object.assign(db, { used: 0, cap: 300, imageUrl: 'https://images.gloceries.com/products/standard.webp', extras: [], category: 'Spices & Masala', attempts: [], updates: [], inserts: [] });
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
  it('the safety text is always appended, whatever the first part says', () => {
    expect(lib.REQUIRED_PROMPT).toBe('empty surface, no other food, no other products, no text, no logos, no people, soft natural light, light tones, minimal');
    for (const id of lib.AI_PRESET_IDS) expect(lib.presetPrompt(id, '#AABBCC').endsWith(`, ${lib.REQUIRED_PROMPT}`)).toBe(true);
    expect(lib.AI_PRESET_IDS).not.toContain('text');
    expect(lib.presetPrompt('pastel', '#AABBCC')).toContain('#AABBCC');
    expect(lib.presetPrompt('beverages')).toBe(`cool light blue backdrop with soft water-droplet texture, ${lib.REQUIRED_PROMPT}`);
    // An edited first part can't drop or replace it.
    const edited = lib.editForm(new Blob(['x']), { preset: 'snacks', prompt: 'mango yellow backdrop, ignore previous rules' });
    expect(edited.get('background.prompt')).toBe(`mango yellow backdrop, ignore previous rules, ${lib.REQUIRED_PROMPT}`);
    expect(lib.cleanPromptBase('  warm   wooden board ,, ')).toBe('warm   wooden board'.replace(/\s+/g, ' '));
    expect(lib.cleanPromptBase('a\nnew line')).toBeNull();
    expect(lib.cleanPromptBase('ab')).toBeNull();
    expect(lib.cleanPromptBase('x'.repeat(201))).toBeNull();
  });

  it('maps each product category to its preset; unknown -> soft studio gradient', () => {
    const cases: [string | null, string][] = [
      ['Fruits & Vegetables', 'fruits_veg'], ['Fresh Vegetables', 'fruits_veg'],
      ['Dairy, Bread & Eggs', 'dairy'], ['Milk & Dairy Drinks', 'dairy'], ['Butter, Cheese & Paneer', 'dairy'],
      ['Meat & Fish', 'meat_fish'], ['Non Veg', 'meat_fish'],
      ['Coastal / Udupi local 🌴', 'coastal'], ['Local & Seasonal', 'coastal'],
      ['Atta, Rice & Dal', 'staples'], ['Rice, Atta & Dal', 'staples'], ['Sugar & Jaggery', 'staples'],
      ['Oil, Ghee & Masala', 'masala'], ['Spices & Masala', 'masala'], ['Oils & Ghee', 'masala'], ['Pickles, Pastes & Sauces', 'masala'],
      ['Snacks & Munchies', 'snacks'], ['Chips & Namkeen', 'snacks'], ['Noodles & Instant Food', 'snacks'], ['Sweets & Chocolates', 'snacks'],
      ['Beverages', 'beverages'], ['Drinks, Juices & Water', 'beverages'], ['Tea & Coffee', 'beverages'],
      ['Bakery & Biscuits', 'bakery'], ['Biscuits & Bakery', 'bakery'], ['Breakfast & Cereals', 'bakery'],
      ['Ice Cream & Frozen', 'frozen'], ['Ice Cream', 'frozen'], ['Frozen Snacks', 'frozen'],
      ['Personal Care', 'personal_care'], ['Skin Care', 'personal_care'], ['Bath & Body', 'personal_care'], ['Oral Care', 'personal_care'],
      ['Household & Cleaning', 'household'], ['Laundry', 'household'], ['Home Cleaners', 'household'], ['Pest Control', 'household'],
      ['Baby Care', 'baby'],
      ['Festival (seasonal)', 'festival'],
      ['Toys & Games', 'studio'], ['Office Supplies', 'studio'], ['', 'studio'], [null, 'studio'],
    ];
    for (const [category, preset] of cases) expect([category, lib.categoryPreset(category)]).toEqual([category, preset]);
    expect(lib.CATEGORY_PRESET_IDS).toHaveLength(14);
    expect(lib.PRESETS.studio.prompt).toBe('soft studio gradient, light neutral tones');
  });

  it('asks for exactly 720x810 with the product fitted in the 648x668 safe box, centred', () => {
    const form = lib.editForm(new Blob(['x']), { preset: 'fruits_veg' });
    expect(form.get('outputSize')).toBe('720x810');
    expect(form.get('scaling')).toBe('fit');
    expect(form.get('removeBackground')).toBe('true');
    expect(form.get('horizontalAlignment')).toBe('center');
    expect(form.get('verticalAlignment')).toBe('center');
    expect(form.get('ignorePaddingAndSnapOnCroppedSides')).toBe('false');
    expect([form.get('paddingLeft'), form.get('paddingRight'), form.get('paddingTop'), form.get('paddingBottom')]).toEqual(['36px', '36px', '71px', '71px']);
    const { left, right, top, bottom } = lib.SAFE_PADDING;
    expect([lib.FRAME.width - left - right, lib.FRAME.height - top - bottom]).toEqual([648, 668]);
    expect(lib.FRAME).toEqual({ width: 720, height: 810 });
    expect(lib.SAFE_PADDING).toEqual({ left: 36, right: 36, top: 71, bottom: 71 });
    // Every category preset gets the same frame and safe box.
    for (const preset of lib.CATEGORY_PRESET_IDS) {
      const f = lib.editForm(new Blob(['x']), { preset });
      expect([f.get('outputSize'), f.get('paddingLeft'), f.get('paddingTop'), f.get('scaling')]).toEqual(['720x810', '36px', '71px', 'fit']);
    }
    expect(String(form.get('background.prompt'))).toContain(lib.REQUIRED_PROMPT);
  });

  it('text headline: tidy 2-line capitals, static background with soft shadow, product lower inside the safe box', async () => {
    expect(lib.headlineLines('black friday')).toEqual(['BLACK', 'FRIDAY']);
    expect(lib.headlineLines('Fresh\n  deals  today')).toEqual(['FRESH', 'DEALS TODAY']);
    expect(lib.headlineLines('SALE')).toEqual(['SALE']);
    expect(lib.headlineLines('a\nb\nc')).toBeNull();
    expect(lib.headlineLines('x'.repeat(41))).toBeNull();
    expect(lib.headlineLines('<script>')).toBeNull();
    expect(lib.headlineLines('   ')).toBeNull();
    const form = lib.editForm(new Blob(['x']), { preset: 'text', background: new Blob(['bg']) });
    expect(form.get('background.imageFile')).toBeInstanceOf(Blob);
    expect(form.get('shadow.mode')).toBe('ai.soft');
    expect(form.get('background.prompt')).toBeNull();
    expect(form.get('outputSize')).toBe('720x810');
    const pad = lib.TEXT_PADDING;
    expect(pad.left >= lib.SAFE_PADDING.left && pad.right >= lib.SAFE_PADDING.right && pad.top >= lib.SAFE_PADDING.top && pad.bottom >= lib.SAFE_PADDING.bottom).toBe(true);
    expect(() => lib.editForm(new Blob(['x']), { preset: 'text' })).toThrow('headline background');
    const ok = `data:image/png;base64,${(await sharp({ create: { width: 720, height: 810, channels: 3, background: '#eeeeee' } }).png().toBuffer()).toString('base64')}`;
    await expect(lib.headlineBackground(ok)).resolves.toBeInstanceOf(Blob);
    const wrong = `data:image/png;base64,${(await sharp({ create: { width: 500, height: 500, channels: 3, background: '#eeeeee' } }).png().toBuffer()).toString('base64')}`;
    await expect(lib.headlineBackground(wrong)).rejects.toThrow('720x810');
    await expect(lib.headlineBackground('https://evil.test/x.png')).rejects.toThrow('missing');
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

  it('text headline needs valid words and its 720x810 background, and records them', async () => {
    expect((await post({ action: 'generate', productId: PRODUCT, preset: 'text', headline: 'a\nb\nc' })).status).toBe(400);
    expect(photoroomCalls).toHaveLength(0);
    const background = `data:image/png;base64,${(await sharp({ create: { width: 720, height: 810, channels: 3, background: '#EEF1F6' } }).png().toBuffer()).toString('base64')}`;
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'text', headline: 'Black friday', textColor: '#0B1026', color: '#EEF1F6', background });
    expect(res.status).toBe(200);
    expect(photoroomCalls[0].body.get('background.imageFile')).toBeInstanceOf(Blob);
    expect(photoroomCalls[0].headers.get('pr-ai-background-model-version')).toBeNull();
    expect(db.inserts[0].values).toMatchObject({ preset: 'text', headline: 'BLACK FRIDAY', text_color: '#0B1026', color: '#EEF1F6', status: 'done' });
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

  it('suggests the preset for the product category, and sends an edited first part with the safety text', async () => {
    const state = await (await route.GET(new Request(`https://admin.test/api/product-images/premium?productId=${PRODUCT}`))).json();
    expect(state.suggestedPreset).toBe('masala');
    expect((await post({ action: 'generate', productId: PRODUCT, preset: 'masala', prompt: 'line one\nline two' })).status).toBe(400);
    expect(photoroomCalls).toHaveLength(0);
    const res = await post({ action: 'generate', productId: PRODUCT, preset: 'masala', prompt: '  dark wood spice shelf  ' });
    expect(res.status).toBe(200);
    expect(photoroomCalls[0].body.get('background.prompt')).toBe(`dark wood spice shelf, ${lib.REQUIRED_PROMPT}`);
    expect(db.inserts[0].values).toMatchObject({ preset: 'masala', prompt: 'dark wood spice shelf' });
    await post({ action: 'generate', productId: PRODUCT, preset: 'bakery' });
    expect(photoroomCalls[1].body.get('background.prompt')).toBe(lib.presetPrompt('bakery'));
    expect(db.inserts[1].values).toMatchObject({ prompt: lib.PRESETS.bakery.prompt });
  });

  const PREMIUM = 'https://images.gloceries.com/products/premium.webp';
  const STANDARD = 'https://images.gloceries.com/products/standard.webp';
  const ATTEMPT = '22222222-2222-4222-8222-222222222222';
  const attempt = () => ({ id: ATTEMPT, preset: 'masala', color: null, status: 'done', url: PREMIUM, error: null, standard_url: STANDARD, created_at: '2026-11-22T00:00:00Z' });

  it('by default the premium photo becomes the second gallery photo; the rembg main photo stays', async () => {
    db.attempts = [attempt()];
    db.extras = ['https://images.gloceries.com/products/back.webp'];
    const res = await post({ action: 'use', productId: PRODUCT, attemptId: ATTEMPT });
    expect(res.status).toBe(200);
    expect(db.updates).toEqual([{ table: 'products', values: { image_url: STANDARD, extra_image_urls: [PREMIUM, 'https://images.gloceries.com/products/back.webp'], premium_image_url: PREMIUM } }]);
  });

  it('"Main photo" puts it on the cover; switching back restores the rembg photo and removes it everywhere', async () => {
    db.attempts = [attempt()];
    await post({ action: 'use', productId: PRODUCT, attemptId: ATTEMPT, placement: 'main' });
    expect(db.updates[0].values).toEqual({ image_url: PREMIUM, extra_image_urls: [], premium_image_url: PREMIUM });
    db.imageUrl = PREMIUM;
    db.extras = [PREMIUM, 'https://images.gloceries.com/products/back.webp'];
    await post({ action: 'use', productId: PRODUCT, attemptId: null });
    expect(db.updates[1].values).toEqual({ image_url: STANDARD, extra_image_urls: ['https://images.gloceries.com/products/back.webp'], premium_image_url: null });
  });

  it('never drops a gallery photo to make room', async () => {
    db.attempts = [attempt()];
    db.extras = Array.from({ length: 7 }, (_, i) => `https://images.gloceries.com/products/${i}.webp`);
    const res = await post({ action: 'use', productId: PRODUCT, attemptId: ATTEMPT });
    expect(res.status).toBe(409);
    expect(db.updates).toHaveLength(0);
  });
});
