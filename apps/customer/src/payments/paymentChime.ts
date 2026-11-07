// The payment-success chime on the Order placed screen. Only for an order
// whose online payment has been confirmed (not cash on delivery).
//
// expo-audio is a native module. App binaries built before it was added have
// no ExpoAudio, and importing expo-audio there throws at import time, so it is
// required only after the native module is known to exist. Older builds stay
// silent instead of crashing. Respects the phone's silent/vibrate switch.
import { requireOptionalNativeModule } from 'expo';
import type { AudioPlayer } from 'expo-audio';

export const PAYMENT_CHIME_URL = 'https://images.gloceries.com/audio/applepay.mp3';

export interface Chime {
  play: () => void;
  release: () => void;
}

const SILENT: Chime = { play: () => {}, release: () => {} };

// Load ahead of time (on screen mount) so it plays right as the tick lands.
export function loadPaymentChime(): Chime {
  if (!requireOptionalNativeModule('ExpoAudio')) return SILENT;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded on purpose, see header.
    const { createAudioPlayer } = require('expo-audio') as typeof import('expo-audio');
    const player: AudioPlayer = createAudioPlayer(PAYMENT_CHIME_URL);
    return {
      play: () => { try { player.play(); } catch { /* sound is a nicety */ } },
      release: () => { try { player.remove(); } catch { /* already released */ } },
    };
  } catch {
    return SILENT;
  }
}
