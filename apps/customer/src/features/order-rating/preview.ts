import { create } from 'zustand';

// A local design preview only: its ID is never sent to the review API.
export const useOrderRatingPreview = create<{
  visible: boolean;
  rating: number;
  show: () => void;
  rate: (rating: number) => void;
}>(set => ({
  visible: false,
  rating: 0,
  show: () => { if (__DEV__) set({ visible: true, rating: 0 }); },
  rate: rating => { if (__DEV__) set({ visible: false, rating }); },
}));
