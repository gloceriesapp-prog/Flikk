// The friendly pill title for the floating active-order tracker. Pure, so
// it has a trivial self-check (activeOrderLabel.selfcheck.ts) and the UI
// never embeds these strings inline. ActiveOrderStatus is the single source
// of truth for "which order statuses are still in-flight" — the three
// non-terminal stages (placed → packed → out_for_delivery) that
// PurchaseScreen.tsx treats as live. useActiveOrder reuses this type.

export type ActiveOrderStatus = 'placed' | 'packed' | 'out_for_delivery';

const LABEL: Record<ActiveOrderStatus, string> = {
  placed: 'Order placed',
  packed: 'Order is getting packed!',
  out_for_delivery: 'On the way!',
};

export function activeOrderLabel(statusKey: ActiveOrderStatus): string {
  return LABEL[statusKey];
}
