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
//
// Volume: `player.volume = 1` is only the app's own gain — the real
// ceiling on how loud this can get is the phone's own hardware media
// volume, which no app can play sound above by design (both iOS and
// Android deliberately block apps from silently blasting audio out past
// whatever the user set). react-native-volume-manager is what actually
// moves that ceiling: `boostToMaxVolume` pushes the device's real media
// volume to 100% right before playing (no native volume-change toast —
// showUI: false), then `scheduleVolumeRestore` puts it back to whatever
// the shop owner had it at, a few seconds after the alert's had time to
// play through. This needs a real native dev build, not Expo Go — see
// this package's own README ("Expo Go is not supported").

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// react-native-volume-manager is a native module with NO Expo Go support —
// a static import crashes at runtime ("doesn't seem to be linked") the moment
// its native side is touched, which no try/catch around the calls can save.
// Load it optionally instead: in Expo Go it's null and the device-volume boost
// is silently skipped; the alert sound still plays via expo-audio (which works
// in Expo Go). ponytail: no JS alternative can move system media volume in
// managed Expo Go — the boost returns automatically in a native dev build.
type VolumeManagerModule = typeof import('react-native-volume-manager').VolumeManager;
let VolumeManager: VolumeManagerModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VolumeManager = require('react-native-volume-manager').VolumeManager;
} catch {
  VolumeManager = null;
}

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

// Long enough to cover the alert clip playing through at least once —
// restoring right after calling .play() would put the shop owner's
// original volume back before they'd actually heard it. Re-armed on every
// new alert (see playOrderAlertSound below), so back-to-back orders keep
// the device at max volume continuously rather than dipping between them.
const VOLUME_RESTORE_DELAY_MS = 8000;

// The device's real volume before this module touched it — null means
// "nothing to restore" (either never boosted yet, or already restored).
// Kept as module state, not per-call, so a second order arriving mid-alert
// doesn't overwrite this with the already-boosted (1.0) value.
let volumeBeforeBoost: number | null = null;
let restoreTimeout: ReturnType<typeof setTimeout> | null = null;

async function boostToMaxVolume(): Promise<void> {
  if (!VolumeManager) return; // Expo Go / native module unavailable — sound plays anyway.
  try {
    if (volumeBeforeBoost === null) {
      const { volume } = await VolumeManager.getVolume();
      volumeBeforeBoost = volume;
    }
    // showUI: false, playSound: false — this is a silent volume change,
    // not a user-initiated one; showing Android's native volume HUD (or
    // playing its own confirmation tone) over an incoming-order alert
    // would be its own distraction.
    await VolumeManager.setVolume(1, { type: 'music', showUI: false, playSound: false });
  } catch {
    // Best-effort — this needs a real native dev build and a physical
    // device (the package's own README: no Expo Go, no iOS simulator).
    // A failure here must never block the alert sound itself, which still
    // plays at whatever volume the OS already has set.
  }
}

function scheduleVolumeRestore(): void {
  if (restoreTimeout) clearTimeout(restoreTimeout);
  restoreTimeout = setTimeout(() => {
    restoreTimeout = null;
    if (volumeBeforeBoost === null) return;
    const restoreTo = volumeBeforeBoost;
    volumeBeforeBoost = null;
    VolumeManager?.setVolume(restoreTo, { type: 'music', showUI: false, playSound: false }).catch(() => {});
  }, VOLUME_RESTORE_DELAY_MS);
}

// Call once, fire-and-forget, at app launch — see file header. Safe to
// call more than once (ensureAudioMode/createAudioPlayer both no-op past
// the first real call), so there's no harm if it's ever invoked twice.
export async function primeOrderAlertSound(): Promise<void> {
  await ensureAudioMode();
  if (!player) player = createAudioPlayer({ uri: SOUND_URL });
}

export async function playOrderAlertSound(): Promise<void> {
  await ensureAudioMode();
  // Fire-and-forget on purpose — boosting the device volume must never
  // delay the sound itself from starting. A failed/slow volume boost
  // still leaves the alert playing at whatever volume was already set.
  void boostToMaxVolume();

  if (!player) {
    player = createAudioPlayer({ uri: SOUND_URL });
  } else {
    player.seekTo(0);
  }
  // Max app-level gain — the ceiling this code alone controls.
  // boostToMaxVolume above is what actually raises the device's own
  // hardware volume past wherever the shop owner had it.
  player.volume = 1;
  player.play();
  scheduleVolumeRestore();
}
