import { apiRequest } from './client';
import type { ApiOrder } from './orders';
import type { ApiTrip } from './trips';
export type OrderLive = Pick<ApiOrder, 'id' | 'live_revision' | 'status' | 'estimated_delivery_minutes' | 'estimated_delivery_at' |
  'packed_at' | 'picked_up_at' | 'delivered_at' | 'delivery_otp' | 'cancel_reason' | 'refund_status' |
  'provider_refund_id' | 'refunded_at' | 'provider_payment_id'> & { rider_id: string | null };
export type TripLive = Pick<ApiTrip, 'id' | 'live_revision' | 'status' | 'estimated_delivery_minutes' | 'estimated_delivery_at' | 'provider_payment_id' | 'cancellation_refund'> & { orders: OrderLive[] };
export const fetchOrderLive = (id: string) => apiRequest<OrderLive>(`/orders/${id}/live`);
export const fetchTripLive = (id: string) => apiRequest<TripLive>(`/trips/${id}/live`);
