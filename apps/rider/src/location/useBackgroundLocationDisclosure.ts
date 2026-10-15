// Drives the background-location disclosure from a foreground tap ("Go
// online"). maybePrompt() decides silently whether the disclosure is needed
// (backgroundDisclosure.ts); the OS prompt is only ever shown after the rider
// taps Continue on the disclosure, never before it and never from the
// background.
//
// A zustand store, not component state: going online swaps OfflineHomeScreen
// for HomeScreen, which unmounts the header that called maybePrompt(). The
// header in the new screen renders the same store, so the disclosure
// survives the swap.

import { AppState, Linking } from 'react-native';
import { create } from 'zustand';
import { disclosureAction, type DisclosureAction } from './backgroundDisclosure';
import {
  clearDisclosureDeclined,
  getBackgroundAccess,
  getDisclosureDeclinedAt,
  recordDisclosureDeclined,
  requestBackgroundAccess,
  startBackgroundLocation,
} from './backgroundLocation';

interface DisclosureState {
  action: Exclude<DisclosureAction, 'none'> | null;
  busy: boolean;
  maybePrompt: () => Promise<void>;
  onContinue: () => Promise<void>;
  onDecline: () => void;
}

export const useBackgroundLocationDisclosure = create<DisclosureState>((set, get) => ({
  action: null,
  busy: false,

  maybePrompt: async () => {
    if (get().action) return;
    const [access, declinedAt] = await Promise.all([getBackgroundAccess(), getDisclosureDeclinedAt()]);
    const next = disclosureAction(access, declinedAt, Date.now());
    set({ action: next === 'none' ? null : next });
  },

  onContinue: async () => {
    const { action, busy } = get();
    if (!action || busy) return;
    set({ busy: true });
    try {
      if (action === 'open_settings') {
        // The grant is picked up on the next background transition, which
        // reads it silently (startBackgroundLocation).
        await Linking.openSettings();
        return;
      }
      const granted = await requestBackgroundAccess();
      if (granted) {
        await clearDisclosureDeclined();
        // Android 11+ grants "all the time" on a Settings page, so the app
        // can come back here already backgrounded; start right away then.
        if (AppState.currentState !== 'active') await startBackgroundLocation();
      } else {
        await recordDisclosureDeclined();
      }
    } finally {
      set({ busy: false, action: null });
    }
  },

  onDecline: () => {
    void recordDisclosureDeclined();
    set({ action: null });
  },
}));
