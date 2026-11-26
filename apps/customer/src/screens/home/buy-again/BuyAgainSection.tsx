// Home "Buy again": products this customer has had delivered before, most
// repeat-bought first (GET /orders/buy-it-again, pin-scoped, live stock and
// price). Nothing for guests or first-time customers.
import { useQuery } from '@tanstack/react-query';
import { fetchBuyItAgain } from '../../../api/orders';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLocationStore } from '../../../store/useLocationStore';
import { ProductSection } from '../products/ProductSection';

export function BuyAgainSection() {
  const customerId = useAuthStore((s) => s.customerId);
  const location = useLocationStore((s) => s.location);
  const { data = [] } = useQuery({
    queryKey: ['home', 'buy-it-again', customerId, location?.latitude, location?.longitude],
    queryFn: fetchBuyItAgain,
    enabled: !!customerId && !!location,
    staleTime: 5 * 60_000,
  });
  const products = data.filter((product) => product.isAvailable !== false);
  return <ProductSection title="Buy again" subtitle="From your past orders" products={products} layout="horizontal" />;
}
