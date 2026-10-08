import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), platformRate: 0.06 }));
vi.mock('../db/supabase.js', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: () => {
      const query = { select: () => query, limit: () => query, maybeSingle: async () => ({ data: { commission_rate: String(mocks.platformRate) }, error: null }) };
      return query;
    },
  },
}));
import { getStoreCommissionRate, getStoreCommissionRates } from './platformSettings.js';

beforeEach(() => { vi.clearAllMocks(); mocks.platformRate = 0.06; });

it('returns each store’s override or the platform default from the database', async () => {
  mocks.rpc.mockResolvedValue({ data: [{ store_id: 'a', commission_rate: '0.035', is_override: true }, { store_id: 'b', commission_rate: '0.06', is_override: false }], error: null });
  const rates = await getStoreCommissionRates(['a', 'b', 'a']);
  expect(mocks.rpc).toHaveBeenCalledWith('store_commission_rates', { p_stores: ['a', 'b'] });
  expect(rates.get('a')).toEqual({ rate: 0.035, isStoreOverride: true });
  expect(rates.get('b')).toEqual({ rate: 0.06, isStoreOverride: false });
});

it('gives an unknown store the platform default', async () => {
  mocks.platformRate = 0.08;
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  expect(await getStoreCommissionRate('x')).toEqual({ rate: 0.08, isStoreOverride: false });
});

it('falls back to the platform rate only when the function is not deployed yet', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'missing' } });
  expect(await getStoreCommissionRate('x')).toEqual({ rate: 0.06, isStoreOverride: false });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'timeout' } });
  await expect(getStoreCommissionRate('x')).rejects.toMatchObject({ code: '57014' });
});
