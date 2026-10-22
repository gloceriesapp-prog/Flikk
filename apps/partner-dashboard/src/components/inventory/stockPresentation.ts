import type { PartnerProduct } from '../../lib/partnerApi';

type StockProduct = Pick<PartnerProduct, 'is_in_stock' | 'stock_status' | 'stock_quantity' | 'stock_tracking_enabled'>;

// The dashboard's running-low filter uses the same 1–4 unit threshold.
// Untracked legacy quantities are unknown, rather than an invented count.
export function stockPresentation(product: StockProduct) {
  const tracked = product.stock_tracking_enabled === true && product.stock_quantity != null && Number.isFinite(product.stock_quantity) && product.stock_quantity >= 0;
  const quantity = tracked ? product.stock_quantity! : null;
  if (!product.is_in_stock || product.stock_status === 'out_of_stock' || quantity === 0) {
    return { label: 'Out of stock', quantity, color: 'bg-red-600', text: 'text-red-600', state: 'out' as const };
  }
  if (quantity == null) {
    return { label: 'Quantity not tracked', quantity, color: 'bg-gray-200', text: 'text-gray-500', state: 'unknown' as const };
  }
  if (quantity < 5) {
    return { label: 'Running low', quantity, color: 'bg-yellow-500', text: 'text-yellow-700', state: 'low' as const };
  }
  return { label: 'In stock', quantity, color: 'bg-emerald-600', text: 'text-emerald-700', state: 'available' as const };
}

// A compact 30-unit scale, capped visually without changing the exact count.
// Red segments indicate an unavailable product, rather than remaining units.
export function productStockTracker(product: StockProduct) {
  const stock = stockPresentation(product);
  const filled = Math.min(30, Math.ceil(stock.quantity ?? 0));
  const segments = Array.from({ length: 30 }, (_, index) => ({
    color: stock.state === 'out' ? 'bg-red-600' : index < filled ? stock.color : 'bg-gray-200',
    tooltip: stock.state === 'out' ? 'Out of stock' : stock.quantity == null ? 'Quantity not tracked' : `${stock.quantity} units left · scale capped at 30 units`,
  }));
  return { stock, segments };
}
