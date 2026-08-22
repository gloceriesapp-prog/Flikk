// Ephemeral UI-signal store for the in-app reminder banner
// (components/OrderReminderBanner.tsx) — feature-local, not in
// src/store/, because unlike useOrdersStore/useCatalogStore/
// useStoreProfileStore this holds no real domain data, just "show this
// banner right now." Narrow enough in purpose that it belongs with the
// feature that owns it rather than the shared store folder.

import { create } from 'zustand';
import type { ReminderStage } from './orderExpiry';

export interface ActiveReminder {
  orderId: string;
  customerName: string;
  stage: ReminderStage;
}

interface OrderReminderState {
  activeReminder: ActiveReminder | null;
  showReminder: (reminder: ActiveReminder) => void;
  dismissReminder: () => void;
}

export const useOrderReminderStore = create<OrderReminderState>((set) => ({
  activeReminder: null,
  showReminder: (reminder) => set({ activeReminder: reminder }),
  dismissReminder: () => set({ activeReminder: null }),
}));
