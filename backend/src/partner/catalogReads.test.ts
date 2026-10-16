import { describe, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocked.from } }));
import { cataloguePage, catalogueSearchPattern, catalogueSearchFilter, PARTNER_PRODUCT_SELECT, readCatalogue } from './catalogReads.js';
const storeId = 'store-a';
describe('partner catalogue read contract', () => {
 it('bounds pages and binds cursors to search, filter and store', () => {
  const request = { query: { page: '1', limit: '30', q: ' milk ', stock: 'in_stock' } };
  const result = cataloguePage(request, storeId); expect(result.search).toBe('milk'); expect(result.page.limit).toBe(30); expect(result.page.envelope).toBe(true);
  expect(() => cataloguePage({ query: { limit: '1000' } }, storeId)).toThrow(); expect(() => cataloguePage({ query: { q: ['a','b'] } }, storeId)).toThrow(); expect(() => cataloguePage({ query: { q: 'a'.repeat(101) } }, storeId)).toThrow(); expect(() => cataloguePage({ query: { stock: 'unknown' } }, storeId)).toThrow();
 });
 it('treats commas, wildcard and PostgREST syntax as literal text', () => {
  expect(catalogueSearchPattern('milk,_%')).toBe('%milk,\\_\\%%'); expect(catalogueSearchFilter('milk,x)')).toBe('name.ilike."%milk,x)%",category.ilike."%milk,x)%"'); expect(PARTNER_PRODUCT_SELECT).not.toContain('*'); expect(PARTNER_PRODUCT_SELECT).not.toContain('store_id');
 });
 it('coalesces in-flight reads within one store and fetches only one bounded page', async () => {
  let finish!: (value: {data: {id: string}[]; error: null}) => void;
  const pending = new Promise<{data: {id: string}[]; error: null}>((resolve) => { finish = resolve; });
  const chain = { select: vi.fn(), eq: vi.fn(), ilike: vi.fn(), or: vi.fn(), neq: vi.fn(), lt: vi.fn(), order: vi.fn(), limit: vi.fn() };
  for (const method of [chain.select,chain.eq,chain.ilike,chain.or,chain.neq,chain.lt,chain.order]) method.mockReturnValue(chain); chain.limit.mockReturnValue(pending); mocked.from.mockReturnValue(chain);
  const selection = cataloguePage({ query: { page: '1', limit: '30', q: 'milk' } }, storeId);
  const first = readCatalogue(storeId,selection); const second = readCatalogue(storeId,selection); expect(mocked.from).toHaveBeenCalledTimes(1); expect(chain.limit).toHaveBeenCalledWith(31); expect(chain.eq).toHaveBeenCalledWith('store_id',storeId); finish({data:[{id:'a'}],error:null}); expect(await first).toEqual(await second);
 });
});
