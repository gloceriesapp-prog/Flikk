// Products for a Today grid card's own page. The server endpoint is the
// source of truth (in stock, same rows the card's tag counted). While it
// can't answer (backend not deployed yet, offline), the public catalogue
// near the customer is filtered by the card's target here instead.
// ponytail: fallback rules cover categories, pinned products, offers and
// bulk; personal cards (usuals) show nothing until the server answers.
import { apiRequest } from '../../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../../api/products';
import type { Product } from '../../products/types';
import { fetchCardProducts, type GridCard } from '../api';

export type CardPageInfo = Pick<GridCard, 'id' | 'title' | 'bannerUrl' | 'categories' | 'target'>;
export const PAGE_LIMIT = 60;

export function pickCardProducts(rows: ApiProduct[], card: CardPageInfo): ApiProduct[] {
  const t = card.target;
  if (t.type === 'products') { const ids = new Set(t.productIds); return rows.filter((r) => ids.has(r.id)); }
  if (t.type === 'action' && t.id === 'offers') return rows.filter((r) => r.original_price != null && r.original_price > r.price);
  if (t.type === 'action' && t.id === 'bulk') return rows.filter((r) => Number(r.bulk_min_kg) > 0);
  if (t.type === 'action' && t.id === 'add-usuals') return [];
  if (t.type === 'subcategory') return rows.filter((r) => r.sub_category_id === t.id);
  const names = new Set(t.type === 'categories' && t.categories.length ? t.categories : card.categories);
  return names.size ? rows.filter((r) => names.has(r.category)) : rows;
}

export async function loadCardPageProducts(card: CardPageInfo, signal?: AbortSignal): Promise<Product[]> {
  try {
    return await fetchCardProducts(card.id);
  } catch {
    const rows = await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false, signal });
    return pickCardProducts(rows, card).slice(0, PAGE_LIMIT).map(mapApiProduct);
  }
}
