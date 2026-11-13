import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ writes: [] as Record<string, unknown>[], calls: [] as string[], error: null as null | { code: string; message: string } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: async (name: string, args: { p_options: Record<string,unknown>[] }) => {
    db.calls.push(name); db.writes.push(...args.p_options); return { error: db.error };
  },
} }));
import { saveProductOptions } from '../../../apps/admin/src/lib/catalogueSave';
import { toProductOptions } from '../../../apps/admin/src/lib/productValidation';
beforeEach(() => { db.writes = []; db.calls = []; db.error = null; });
it('persists the chosen flavour gallery alongside its cover, and permits clearing', async () => {
  for (const extraImageUrls of [['https://cdn.example/back.webp', 'https://cdn.example/side.webp'], []]) {
    await saveProductOptions('product', toProductOptions({ options: [{ id: 'mango', name: 'Mango', imageUrl: 'https://cdn.example/cover.webp', extraImageUrls }] })!);
    expect(db.writes.at(-1)).toMatchObject({ image_url: 'https://cdn.example/cover.webp', extra_image_urls: extraImageUrls });
  }
  expect(db.calls).toEqual(['save_product_options','save_product_options']);
});
it('an older editor omitting gallery data leaves saved gallery photos untouched', async () => {
  await saveProductOptions('product', toProductOptions({ options: [{ id: 'mango', name: 'Mango', imageUrl: 'https://cdn.example/cover.webp' }] })!);
  expect(db.writes.at(-1)).not.toHaveProperty('extra_image_urls');
});
it('sends stock counts atomically and surfaces an active-reservation conflict',async()=>{
  await saveProductOptions('product',toProductOptions({options:[{name:'Mango',stockQuantity:5}]})!);
  expect(db.writes.at(-1)).toMatchObject({stock_quantity:5});
  db.error={code:'P0409',message:'This flavour has reserved stock.'};
  await expect(saveProductOptions('product',[])).rejects.toMatchObject({status:409,message:'This flavour has reserved stock.'});
});
