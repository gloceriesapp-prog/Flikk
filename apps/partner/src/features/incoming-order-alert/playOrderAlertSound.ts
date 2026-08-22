// The actual "sound on the phone" for a new order — plays the real
// orders-received.mp3 via expo-audio, configured with `playsInSilentMode`
// so it's audible even with the phone's silent/mute switch on. That's the
// same behavior a phone-call ringtone or an alarm gets, deliberately: a
// shop owner with the phone in their pocket on silent still needs to know
// an order just came in — a sound that respects the mute switch would
// defeat the entire point of this alert.
//
// Replaces the earlier local-notification-based version (expo-notifications
// scheduleNotificationAsync) — that only ever played the OS's default
// notification sound and, like any notification sound, is muted by the
// silent switch by design. A custom audio file that needs to survive
// silent mode has to go through the audio session APIs (expo-audio), not
// the notification APIs.
//
// The player is created eagerly at module load (see `player` below), not
// lazily on the first call — a lazily-created player means the very first
// alert after a cold app start would try to `.play()` a remote MP3 that
// hasn't finished buffering yet, which is exactly the alert that most
// needs to be heard. App.tsx calls primeOrderAlertSound() once on launch
// so both the audio session and the file itself have had time to warm up
// well before any real order arrives.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOUND_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/voice-sound/orders-received.mp3';

let audioModeConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  await setAudioModeAsync({
    playsInSilentMode: true,
    // 'duckOthers', not 'mixWithOthers' — this temporarily lowers
    // whatever else is playing (music, another app) instead of layering
    // on top of it at the same level, so the alert reads as clearly the
    // loudest thing happening, not one voice in a mix.
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
  });
}

// One player, reused rather than recreated per call — an order that
// arrives while the previous alert's sound is still finishing just
// restarts it from the top instead of overlapping two instances.
let player: AudioPlayer | null = null;

// Call once, fire-and-forget, at app launch — see file header. Safe to
// call more than once (ensureAudioMode/createAudioPlayer both no-op past
// the first real call), so there's no harm if it's ever invoked twice.
export async function primeOrderAlertSound(): Promise<void> {
  await ensureAudioMode();
  if (!player) player = createAudioPlayer({ uri: SOUND_URL });
}

export async function playOrderAlertSound(): Promise<void> {
  await ensureAudioMode();

  if (!player) {
    player = createAudioPlayer({ uri: SOUND_URL });
  } else {
    player.seekTo(0);
  }
  // Max app-level gain — this is the ceiling this code controls. The
  // actual loudness a shop owner hears is still capped by the device's
  // hardware media volume; no app API can push sound out above that
  // (iOS/Android both block apps from silently cranking the system
  // volume, for obvious reasons) — turning the phone's own volume up is
  // the only way past this ceiling.
  player.volume = 1;
  player.play();
}
