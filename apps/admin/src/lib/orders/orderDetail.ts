// Shape of GET /api/orders/[id] — the admin order detail page's one read.
// Type-only module so the client page can import it.
import type { OrderStatus } from '@/lib/types';

export interface OrderDetailItem {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
}

export interface OrderDetailLeg {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: OrderStatus;
  total: number;
  riderId: string | null;
  cancelReason: string | null;
  refundStatus: string;
}

export interface OrderTimelineEvent {
  at: string;
  label: string;
  detail?: string | null;
  // 'admin' events come from admin_order_actions (migration 109).
  kind: 'status' | 'admin' | 'code';
}

export interface DeliveryCodeState {
  // The code itself is never sent to admin; only its lifecycle.
  exists: boolean;
  expiresAt: string | null;
  attempts: number;
  maxAttempts: number;
  consumedAt: string | null;
  state: 'none' | 'active' | 'expired' | 'locked' | 'used';
  resets: number;
  lastResetAt: string | null;
  // reissue_delivery_code only issues a code for an order out for delivery.
  canReissue: boolean;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  packedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  itemTotal: number;
  deliveryFee: number;
  handlingFee: number;
  discountAmount: number;
  total: number;
  commissionAmount: number;
  items: OrderDetailItem[];
  customer: { id: string; name: string | null; phone: string | null };
  address: { text: string; recipientName: string | null; recipientPhone: string | null; instructions: string | null } | null;
  store: { id: string; name: string; phone: string | null; district: string | null };
  rider: { userId: string; riderId: string | null; name: string | null; phone: string | null; presence: string | null; lastSeenAt: string | null } | null;
  trip: {
    id: string;
    status: string;
    total: number;
    deliveryFee: number;
    cancelledBy: string | null;
    // The leg (and its store) whose cancellation cancelled the whole trip.
    cancelOriginOrderId: string | null;
    cancelOriginStoreName: string | null;
    legs: OrderDetailLeg[];
  } | null;
  payment: {
    method: string;
    provider: string | null;
    providerPaymentId: string | null;
    refundStatus: string;
    providerRefundId: string | null;
    refundedAt: string | null;
    // order_refund_jobs (single order) or trip_refunds (trip), when one exists.
    refundJob: { scope: 'order' | 'trip'; status: string; targetPaise: number; refundedPaise: number | null; attempts: number; lastError: string | null } | null;
  };
  promo: { code: string; discountAmount: number } | null;
  deliveryCode: DeliveryCodeState;
  timeline: OrderTimelineEvent[];
}
