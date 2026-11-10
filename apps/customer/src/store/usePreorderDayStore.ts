// Remember the last delivery day selected in a pre-order product sheet
// for other sheets opened during the same session.
import { create } from 'zustand';

interface PreorderDayState {
  day: string | null;
  setDay: (day: string) => void;
}

export const usePreorderDayStore = create<PreorderDayState>((set) => ({
  day: null,
  setDay: (day) => set({ day }),
}));
