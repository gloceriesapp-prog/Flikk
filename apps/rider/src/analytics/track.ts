// Rider product analytics → POST /rider/events → rider_events table (backend
// lib/riderEvents.ts allowlists names and strips props). Only behaviour the
// server can't see from orders: opens, screens, online sessions, offer
// reactions, navigation and call taps. Never pass phone numbers, names or
// typed text in props — ids and short labels only.
//
// Best-effort by design: events buffer in memory and go up every 30s, at a
// full batch, or when the app is backgrounded. A network failure keeps them
// for the next try; anything else (401/403/429) drops them — analytics must
// never retry forever or touch the session.
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { BATCH_SIZE, createEventQueue, type EventProps, type RiderEventName } from './eventQueue';

const FLUSH_INTERVAL_MS = 30_000;
const queue = createEventQueue();
let sending = false;
let started = false;

// Only an approved rider has a /rider/* session; before that, events are
// dropped rather than sent into a 403.
function canSend(): boolean {
  const s = useAuthStore.getState();
  return !!s.accessToken && s.role === 'rider' && s.isApproved;
}

export function track(name: RiderEventName, props?: EventProps): void {
  if (!canSend()) return;
  queue.push({ name, at: new Date().toISOString(), props });
  if (queue.size >= BATCH_SIZE) void flush();
}

export async function flush(): Promise<void> {
  if (sending || !queue.size) return;
  if (!canSend()) {
    queue.clear();
    return;
  }
  sending = true;
  const batch = queue.take();
  try {
    await apiRequest('/rider/events', {
      method: 'POST',
      body: { events: batch, app_version: Constants.expoConfig?.version ?? null, platform: Platform.OS },
    });
  } catch (err) {
    // ApiError status 0 = never reached the server (offline/timeout): retry later.
    if ((err as { status?: number }).status === 0) queue.putBack(batch);
  } finally {
    sending = false;
  }
}

// Called once from App.tsx. app_opened fires on every return to foreground,
// which is what "how often riders open the app" means in practice.
export function startAnalytics(): void {
  if (started) return;
  started = true;
  track('app_opened');
  setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') track('app_opened');
    else void flush();
  });
}
