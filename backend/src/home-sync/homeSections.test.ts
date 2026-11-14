import { expect, it, vi } from 'vitest';
const cache = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: {} }));
vi.mock('../lib/logger.js', () => ({ logger: { warn: vi.fn() } }));
vi.mock('../auth/authenticate.js', () => ({ invalidateAuthUser: vi.fn(), invalidateAllAuthContexts: vi.fn() }));
vi.mock('../middleware/shortCache.js', () => ({ invalidateShortCache: cache, invalidateInventoryCache: vi.fn() }));
import { HOME_SECTION_TABLES, homeSectionsChanged } from '../routes/homeContent.js';
it('invalidates both layout and location-scoped picks when a Home selection changes', () => {
  expect(HOME_SECTION_TABLES).toContain('home_section_products');
  cache.mockClear();
  homeSectionsChanged();
  expect(cache).toHaveBeenCalledWith('/home/sections');
  expect(cache).toHaveBeenCalledWith('/browse/home-picks');
  expect(cache).not.toHaveBeenCalledWith('/orders');
});
