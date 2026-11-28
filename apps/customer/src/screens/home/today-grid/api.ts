// GET /home/today-grid (backend/src/today-grid). The server decides which
// cards show and every number on them; the app only renders and taps.
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';
import type { Product } from '../products/types';
// Card shapes come from the shared rules package, so app and server never drift.
import type { GridCard } from '../../../../../../packages/today-grid/index.js';
export type { CardTarget, GridCard } from '../../../../../../packages/today-grid/index.js';

export interface TodayGrid {
  enabled: boolean;
  hero: GridCard | null;
  cards: GridCard[];
  slot: string | null;
  refreshAt?: string;
  generatedAt: string;
}

export function fetchTodayGrid(signal?: AbortSignal): Promise<TodayGrid> {
  return apiRequest<TodayGrid>('/home/today-grid', { signal });
}

// The live in-stock products behind a card (same rows its tag counted).
export async function fetchCardProducts(cardId: string): Promise<Product[]> {
  const { products } = await apiRequest<{ products: ApiProduct[] }>(`/home/today-grid/cards/${encodeURIComponent(cardId)}/products`);
  return products.map(mapApiProduct);
}

export interface GridEvent { type: 'impression' | 'tap' | 'add_to_cart'; cardId: string; slot: string; position: number; hero: string; ledToAddToCart?: boolean }
export function postGridEvents(events: GridEvent[]): Promise<void> {
  return apiRequest('/home/today-grid/events', { method: 'POST', body: { events } });
}
