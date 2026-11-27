// Which Home the customer is browsing: the full Gloceries catalogue or the
// Udupi-local picks (the admin "regional" tab content). Shared by the header
// switch and HomeScreen, which are siblings, so it lives in a store.
import { create } from 'zustand';

export type HomeMode = 'gloceries' | 'udupi';

export const HOME_MODES: { id: HomeMode; label: string }[] = [
  { id: 'gloceries', label: 'Gloceries' },
  { id: 'udupi', label: 'Udupi' },
];

interface HomeModeState {
  mode: HomeMode;
  setMode: (mode: HomeMode) => void;
}

export const useHomeModeStore = create<HomeModeState>((set) => ({
  mode: 'gloceries',
  setMode: (mode) => set({ mode }),
}));

// The admin's "Udupi" Home tab is reached through this switch, not the
// category row.
export function isUdupiTab(tab: { name: string }) {
  return tab.name.trim().toLowerCase() === 'udupi';
}
