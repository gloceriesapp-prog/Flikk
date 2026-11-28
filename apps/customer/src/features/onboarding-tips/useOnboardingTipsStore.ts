// One-time tips (coach marks). Which ones this device has already shown is
// kept on-device (zustand persist + AsyncStorage, same as the cart), so each
// tip appears once per install, then never again.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TipId = 'udupi-mode';

interface OnboardingTipsState {
  seen: Partial<Record<TipId, true>>;
  // False until the saved list has loaded: a returning customer must never
  // get a tip flashed at them while storage is still being read.
  hydrated: boolean;
  markSeen: (id: TipId) => void;
}

export const useOnboardingTipsStore = create<OnboardingTipsState>()(
  persist(
    (set) => ({
      seen: {},
      hydrated: false,
      markSeen: (id) => set((state) => ({ seen: { ...state.seen, [id]: true } })),
    }),
    {
      name: 'gloceries-onboarding-tips',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ seen: state.seen }),
      onRehydrateStorage: () => () => useOnboardingTipsStore.setState({ hydrated: true }),
    },
  ),
);

// Whether a tip may show now: storage loaded, never shown, and the screen
// says the moment is right.
export function useTipDue(id: TipId, ready: boolean): boolean {
  const hydrated = useOnboardingTipsStore((state) => state.hydrated);
  const seen = useOnboardingTipsStore((state) => !!state.seen[id]);
  return ready && hydrated && !seen;
}
