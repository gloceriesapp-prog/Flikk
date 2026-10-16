import { apiRequest } from './client';
import type { ApiOrder } from './orders';
import type { ApiTrip } from './trips';
export type OrderLive = Pick<ApiOrder, 'id' | 'live_revision' | 'status' | 'estimated_delivery_minutes' | 'estimated_delivery_at' |
  'packed_at' | 'picked_up_at' | 'delivered_at' | 'delivery_otp' | 'cancel_reason' | 'refund_status' |
  'provider_refund_id' | 'refunded_at' | 'provider_payment_id'> & { rider_id: string | null };
export type TripLive = Pick<ApiTrip, 'id' | 'live_revision' | 'status' | 'estimated_delivery_minutes' | 'estimated_delivery_at' | 'provider_payment_id' | 'cancellation_refund'> & { orders: OrderLive[] };
export const fetchOrderLive = (id: string) => apiRequest<OrderLive>(`/orders/${id}/live`);
export const fetchTripLive = (id: string) => apiRequest<TripLive>(`/trips/${id}/live`);

// GET /orders/:id/rider-location and GET /trips/:id/rider-location
// (backend/src/tracking/riderLocation.ts). Customer-scoped; rider_location is
// only ever non-null while the order (or a trip leg) is out_for_delivery.
export interface MapCoordinates { lat: number; lng: number }
export interface RiderLocation extends MapCoordinates {
  updated_at: string;
  // Computed by the server at response time, so device clock skew can't
  // make a fresh ping look old (or an old one fresh).
  age_seconds: number;
  stale: boolean;
}
export interface RiderLocationResponse {
  active: boolean;
  rider_location: RiderLocation | null;
  destination: MapCoordinates | null;
  stale_after_seconds: number;
}
export const fetchOrderRiderLocation = (id: string) => apiRequest<RiderLocationResponse>(`/orders/${id}/rider-location`);
export const fetchTripRiderLocation = (id: string) => apiRequest<RiderLocationResponse>(`/trips/${id}/rider-location`);
