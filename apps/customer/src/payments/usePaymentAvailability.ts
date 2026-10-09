import { useQuery } from '@tanstack/react-query';
import { fetchPaymentAvailability } from '../api/payments';
import type { AllowedPaymentMethods } from './paymentMethod';

// Admin can switch COD / online payment off (backend GET
// /payments/availability). Refreshed every minute while a checkout screen is
// open; until it loads (or if it fails) both methods stay visible and the
// server's own check at order creation decides.
export function usePaymentAvailability() {
  const query = useQuery({ queryKey: ['payment-availability'], queryFn: fetchPaymentAvailability, staleTime: 60_000, refetchInterval: 60_000 });
  const allowed: AllowedPaymentMethods = { cod: query.data?.cod ?? true, online: query.data?.online ?? true };
  return { allowed, minOrderValue: query.data?.min_order_value ?? 0, loaded: query.isSuccess };
}
