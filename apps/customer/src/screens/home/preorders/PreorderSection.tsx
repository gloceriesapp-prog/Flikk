// Home "Pre-orders" row (admin Home Sections key 'preorders'): the only place
// pre-order products appear. ADD opens the product sheet, where the customer
// picks a day and slot (mustPickInDetail).
import { ProductSection } from '../products/ProductSection';
import { usePreorders } from './usePreorders';

export function PreorderSection({ title }: { title: string }) {
  const { data } = usePreorders();
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  if (products.length === 0 || !data?.slots.length) return null;
  return <ProductSection title={title} products={products} />;
}
