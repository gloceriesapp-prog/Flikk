// Same 4 stages as backend/src/lib/orderStateMachine.ts (placed -> packed ->
// out_for_delivery -> delivered) — this screen's timeline mirrors the real
// state machine on purpose, not an invented one, so wiring it to a real
// order's actual status later is a data swap, not a redesign.
//
// No live map/GPS here deliberately — CLAUDE.md scopes v1 to status-only
// 4-stage tracking; "a rider app exists" doesn't mean live map tracking for
// the customer. The reference UIs this screen was asked to replicate both
// had a live map with a moving vehicle icon; that part was intentionally
// left out, not missed.

import { CheckmarkCircle02Icon, DeliveryTruck01Icon, PackageIcon, Store01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered';

export interface StageMeta {
  status: OrderStatus;
  title: string;
  subtitle: string;
  icon: IconSvgElement;
}

export const ORDER_STAGES: StageMeta[] = [
  { status: 'placed', title: 'Order Placed', subtitle: "We've received your order", icon: CheckmarkCircle02Icon },
  { status: 'packed', title: 'Packed', subtitle: 'Store has packed your items', icon: Store01Icon },
  { status: 'out_for_delivery', title: 'Out for Delivery', subtitle: 'Your rider is on the way', icon: DeliveryTruck01Icon },
  { status: 'delivered', title: 'Delivered', subtitle: 'Estimated delivery', icon: PackageIcon },
];

// No real order-status backend wired to this screen yet (see
// TrackOrderScreen.tsx) — minute offsets from order-placed time, purely to
// demo the timeline with plausible-looking timestamps.
export const STAGE_OFFSET_MINUTES: Record<OrderStatus, number> = {
  placed: 0,
  packed: 5,
  out_for_delivery: 15,
  delivered: 35,
};

// Which stage is "current" in the demo — out_for_delivery done, delivered
// still pending. Swap this for a real `order.status` once one exists.
export const DEMO_CURRENT_STATUS: OrderStatus = 'out_for_delivery';
