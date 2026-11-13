import type { ContentSelection } from '@/lib/homeContent';

/** Picking a new source replaces stale template filters, never the catalogue itself. */
export function categoryTileSelection(value: ContentSelection, source: { categories: string[] } | { products: string[] }): ContentSelection {
  const categories = 'categories' in source;
  const nextIds = categories ? source.categories : source.products;
  const previousIds = categories ? value.categoryIds : value.productIds;
  const sameSource = value.mode === (categories ? 'automatic' : 'manual') && previousIds.length === nextIds.length && previousIds.every(id => nextIds.includes(id));
  if (sameSource) return { ...value, ...(categories ? { categoryIds: nextIds } : { productIds: nextIds }) };
  return { ...value, mode: categories ? 'automatic' : 'manual',
    categoryIds: 'categories' in source ? source.categories : [],
    productIds: 'products' in source ? source.products : [],
    storeIds: [], includeTerms: [], excludeTerms: [], discountedOnly: false };
}
