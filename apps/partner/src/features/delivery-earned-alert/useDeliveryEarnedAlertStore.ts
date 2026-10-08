// Ephemeral UI-signal store for the in-app "you earned ₹X" banner
// (DeliveryEarnedBanner.tsx) — feature-local, not in src/store/, same
// reasoning as order-expiry's own useOrderReminderStore: this holds no
// real domain data, just "show this banner right now."

import { create } from 'zustand';

export interface ActiveEarning {
  orderId: string;
  orderNumber: string;
  // Real orders.item_total - commission_amount (PartnerOrder.netPayout,
  // screens/orders/data.ts) — never a figure computed fresh here.
  netEarned: number;
}

interface DeliveryEarnedAlertState {
  activeEarning: ActiveEarning | null;
  showEarning: (earning: ActiveEarning) => void;
  dismissEarning: () => void;
}

export const useDeliveryEarnedAlertStore = create<DeliveryEarnedAlertState>((set) => ({
  activeEarning: null,
  showEarning: (earning) => set({ activeEarning: earning }),
  dismissEarning: () => set({ activeEarning: null }),
}));
