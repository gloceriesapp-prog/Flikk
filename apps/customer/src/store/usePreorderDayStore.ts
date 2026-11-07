// The pre-order day the customer tapped on Home's date strip. The Pre-orders
// panel shows the products deliverable that day, and the product sheet opens
// on it (ProductPreorderOptions). Not persisted: a new session starts on the
// first open day again.
import { create } from 'zustand';

interface PreorderDayState {
  day: string | null;
  setDay: (day: string) => void;
}

export const usePreorderDayStore = create<PreorderDayState>((set) => ({
  day: null,
  setDay: (day) => set({ day }),
}));
