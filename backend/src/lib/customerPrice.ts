// Gloceries' extra on top of the store price (migration 20261104160000).
//
// product_variants.price is the STORE price: what the store sets and is paid.
// platform_markup is a fixed rupee amount per pack, set only in admin. The
// customer pays store price + markup, never above MRP; a store price that is
// already above MRP is charged as is. Same rule as the database's
// customer_unit_price(), which checks every order line.
//
// Customers only ever see customer prices (applyCustomerPrices on every
// customer product feed) and stores only ever see store prices
// (toStorePrices / partner order mapping), so neither side learns the markup.

import { flavourPriceOverride, type FlavourPrices } from './flavourPricing.js';
import { round2 } from './pricing.js';

export function customerUnitPrice(storePrice: number, markup: number | null | undefined, mrp: number | null | undefined): number {
  const withMarkup = round2(storePrice + Math.max(Number(markup ?? 0), 0));
  if (mrp == null || !(Number(mrp) > 0)) return withMarkup;
  return Math.max(storePrice, Math.min(withMarkup, Number(mrp)));
}

interface PricedVariant {
  id?: string; unit_type?: string; quantity?: number;
  price: number;
  original_price: number | null;
  is_default?: boolean;
  platform_markup?: number | string | null;
}
interface PricedProduct {
  product_options?: { price_overrides?: FlavourPrices; [key: string]: unknown }[];
  price?: number;
  original_price?: number | null;
  product_variants?: PricedVariant[];
}

// A product row as a customer sees it: every pack at its customer price, the
// product's own price/MRP taken from its default pack, markup removed.
function customerProduct<T extends PricedProduct>(product: T): T {
  if (!Array.isArray(product.product_variants) && !Array.isArray(product.product_options)) return product;
  const originals = product.product_variants ?? [];
  const variants = originals.map(({ platform_markup, ...variant }) => ({
    ...variant,
    price: customerUnitPrice(Number(variant.price), Number(platform_markup ?? 0), variant.original_price),
  }));
  const main = variants.find((v) => v.is_default) ?? variants[0];
  const shown = { ...product, product_variants: variants, ...(main ? { price: main.price, original_price: main.original_price } : {}) } as unknown as Record<string, unknown>;
  if (product.product_options) shown.product_options = product.product_options.map(({ price_overrides, ...option }) => {
    const packs: (PricedVariant | null)[] = originals.length ? originals : [null];
    const customer_prices = Object.fromEntries(packs.map(variant => {
      const override = flavourPriceOverride(price_overrides, variant);
      const storePrice = Number(override?.price ?? variant?.price ?? product.price);
      const mrp = override?.original_price ?? variant?.original_price ?? product.original_price;
      return [variant?.id ?? 'base', { price: variant ? customerUnitPrice(storePrice, Number(variant.platform_markup ?? 0), mrp) : storePrice, original_price: mrp ?? null }];
    }));
    return { ...option, ...(option.is_available === undefined ? {} : { is_available: option.is_available !== false && option.stock_quantity !== 0 }), customer_prices };
  });
  delete shown.waive_commission;
  return shown as T;
}

// Product rows, or rows that embed one under `products` (wishlist, festival
// section), as customers see them.
export function applyCustomerPrices<T>(rows: T): T {
  if (Array.isArray(rows)) return rows.map((row) => applyCustomerPrices(row)) as T;
  if (!rows || typeof rows !== 'object') return rows;
  const row = rows as Record<string, unknown>;
  if (row.products && typeof row.products === 'object') return { ...row, products: applyCustomerPrices(row.products) } as T;
  return customerProduct(row as PricedProduct) as T;
}

// A store's own product rows without the markup column.
export function withoutMarkup<T>(rows: T): T {
  if (Array.isArray(rows)) return rows.map((row) => withoutMarkup(row)) as T;
  if (!rows || typeof rows !== 'object') return rows;
  const row = rows as Record<string, unknown>;
  if (!Array.isArray(row.product_variants)) return rows;
  return { ...row, product_variants: row.product_variants.map(({ platform_markup: _markup, ...variant }) => variant) } as T;
}

interface StoreFacingOrder {
  item_total?: number;
  total?: number;
  store_item_total?: number | null;
  order_items?: { unit_price_at_order: number; store_unit_price_at_order?: number | null }[];
}

// An order as its store sees it: store prices and the store total only.
// Orders from before the markup existed have no store columns and read as is.
export function toStoreOrder<T extends object>(row: T): T {
  const order = row as StoreFacingOrder;
  const { store_item_total, ...rest } = order;
  const storeTotal = store_item_total == null ? order.item_total : Number(store_item_total);
  return {
    ...rest,
    ...(order.item_total !== undefined ? { item_total: storeTotal } : {}),
    ...(order.total !== undefined ? { total: storeTotal } : {}),
    ...(order.order_items ? {
      order_items: order.order_items.map(({ store_unit_price_at_order, ...item }) => ({
        ...item,
        unit_price_at_order: store_unit_price_at_order == null ? item.unit_price_at_order : Number(store_unit_price_at_order),
      })),
    } : {}),
  } as T;
}

// The store's amount for one order, for payout and earnings math.
export function storeItemTotal(order: { item_total: number; store_item_total?: number | null }): number {
  return Number(order.store_item_total ?? order.item_total);
}
