import { AppError } from './errors.js';
export type FlavourPrices = Record<string, { price: number; original_price?: number }>;
export function flavourPriceOverride(prices: FlavourPrices | null | undefined, variant?: { unit_type?: string; quantity?: number } | null) {
  const key = variant ? `${variant.unit_type}:${Number(variant.quantity)}` : 'base';
  const value = prices?.[key];
  if (value && (!Number.isFinite(Number(value.price)) || Number(value.price) <= 0 || (value.original_price != null && (!Number.isFinite(Number(value.original_price)) || Number(value.original_price) < Number(value.price))))) throw new AppError(409, 'INVALID_PRICE', 'This flavour cannot be ordered right now.');
  return value;
}
