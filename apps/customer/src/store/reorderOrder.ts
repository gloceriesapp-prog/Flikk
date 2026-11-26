// "Reorder items" on a delivered order: the same lines (product, pack, cut,
// flavour, serving, quantity) rebuilt from today's catalogue, so the cart
// gets today's prices and stock, never the prices stored on the old order.
// Lines that can't be bought now (gone, out of stock, outside the delivery
// area, pre-order products that need a slot) are skipped and counted.
import type { ApiOrderItem } from '../api/orders';
import type { Product } from '../screens/home/products/types';
import { flavourPrice } from '../components/FlavourPicker/flavourPricing';
import { cartLineId } from './cartIdentity';
import type { CartProduct } from './useCartStore';

export type ReorderSource = Pick<ApiOrderItem, 'product_id' | 'quantity' | 'variant_id' | 'cut_size' | 'serving' | 'option_name_at_order'> & { option_id?: string | null };

export function reorderLines(items: ReorderSource[], catalogue: Product[]) {
  const byId = new Map(catalogue.map(product => [product.id, product]));
  const lines: { product: CartProduct; quantity: number }[] = [];
  let skipped = 0;
  for (const item of items) {
    const product = byId.get(item.product_id);
    if (!product || product.isAvailable === false || product.preorder) { skipped += 1; continue; }
    // The same pack when it still exists; a product without packs has none.
    const variant = item.variant_id ? product.variants?.find(v => v.id === item.variant_id) : undefined;
    if ((item.variant_id && product.variants?.length && !variant) || variant?.isAvailable === false) { skipped += 1; continue; }
    const option = item.option_id || item.option_name_at_order
      ? product.options?.find(o => o.id === item.option_id) ?? product.options?.find(o => o.name === item.option_name_at_order)
      : undefined;
    if ((item.option_id || item.option_name_at_order) && (!option || !option.isAvailable)) { skipped += 1; continue; }
    const cutSize = product.cutOptions ? item.cut_size ?? undefined : undefined;
    const serving = item.serving && product.servingOptions?.includes(item.serving) ? item.serving : undefined;
    const variantId = variant?.id ?? product.defaultVariantId;
    const stock = option?.availableQuantity ?? (variant ?? product).availableQuantity;
    const quantity = Math.min(item.quantity, stock ?? item.quantity, 999);
    if (quantity < 1) { skipped += 1; continue; }
    const { price, originalPrice } = flavourPrice(product, option, variant);
    lines.push({
      quantity,
      product: {
        isAvailable: true, id: cartLineId(product.id, variantId, cutSize, option?.id, serving), productId: product.id, variantId, cutSize,
        optionId: option?.id, optionName: option?.name, serving, name: product.name, weight: variant?.label ?? product.weight,
        price, originalPrice, storeId: product.storeId ?? '', storeName: product.storeName, imageUrl: option?.imageUrl ?? product.imageUrl,
      },
    });
  }
  return { lines, skipped };
}
