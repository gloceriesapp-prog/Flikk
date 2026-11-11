import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ writes: [] as Record<string, unknown>[] }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  from: () => {
    const result = { data: [{ id: 'mango' }], error: null };
    const chain = {
      select: () => chain, eq: () => chain, in: () => chain, delete: () => chain,
      update: (row: Record<string, unknown>) => { db.writes.push(row); return chain; },
      insert: (row: Record<string, unknown>) => { db.writes.push(row); return chain; },
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  },
} }));
import { saveProductOptions } from '../../../apps/admin/src/lib/catalogueSave';
import { toProductOptions } from '../../../apps/admin/src/lib/productValidation';

beforeEach(() => { db.writes = []; });

it('persists the chosen flavour gallery alongside its cover, and permits clearing', async () => {
  for (const extraImageUrls of [['https://cdn.example/back.webp', 'https://cdn.example/side.webp'], []]) {
    await saveProductOptions('product', toProductOptions({ options: [{ id: 'mango', name: 'Mango', imageUrl: 'https://cdn.example/cover.webp', extraImageUrls }] })!);
    expect(db.writes.at(-1)).toMatchObject({ image_url: 'https://cdn.example/cover.webp', extra_image_urls: extraImageUrls });
  }
});

it('an older editor omitting gallery data leaves saved gallery photos untouched', async () => {
  await saveProductOptions('product', toProductOptions({ options: [{ id: 'mango', name: 'Mango', imageUrl: 'https://cdn.example/cover.webp' }] })!);
  expect(db.writes.at(-1)).not.toHaveProperty('extra_image_urls');
});
