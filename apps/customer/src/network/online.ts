// Wiring between react-query's onlineManager and whatever connectivity source
// an app has — kept here so all three Expo apps teach react-query about the
// network the same way. This package stays free of native deps on purpose:
// @react-native-community/netinfo is NEVER imported here. The app injects it
// (createNetInfoSubscriber) or injects any other `subscribe` fn, and shared
// only owns the adapter shape.

// What react-query's onlineManager.setEventListener expects: a setup fn given
// a `setOnline` callback, returning a cleanup (or undefined). Typed
// structurally so a fake onlineManager works in tests and so we don't couple
// to a specific @tanstack/react-query version here (queryClient.ts already
// imports the real type where it matters).
export type OnlineSubscribe = (setOnline: (online: boolean) => void) => () => void;

export interface OnlineManagerLike {
  setEventListener(setup: (setOnline: (online: boolean) => void) => (() => void) | undefined): void;
}

// Register `subscribe` as onlineManager's event source and return a teardown.
// onlineManager invokes the setup lazily (on its first subscriber) and again
// whenever setEventListener is reset, so we capture the live cleanup in a
// closure; the returned unsubscribe tears down the current one.
export function wireOnlineManager(onlineManager: OnlineManagerLike, subscribe: OnlineSubscribe): () => void {
  let cleanup: (() => void) | undefined;
  onlineManager.setEventListener((setOnline) => {
    cleanup = subscribe(setOnline);
    return cleanup;
  });
  return () => {
    cleanup?.();
    cleanup = undefined;
  };
}

// Minimal structural view of @react-native-community/netinfo — only what the
// subscriber reads, so the real module satisfies it without being imported.
export interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}
export interface NetInfoLike {
  addEventListener(listener: (state: NetInfoState) => void): () => void;
}

// Given an app-injected NetInfo module, build the `subscribe` fn wireOnlineManager
// wants. Online = actually connected AND not explicitly unreachable (null
// reachability is treated as reachable — NetInfo reports null while a probe is
// still pending, and treating "unknown" as offline would flap the UI offline on
// every reconnect).
export function createNetInfoSubscriber(NetInfo: NetInfoLike): OnlineSubscribe {
  return (setOnline) =>
    NetInfo.addEventListener((state) =>
      setOnline(!!state.isConnected && state.isInternetReachable !== false),
    );
}
// Headless offline-state primitive. This package has no React dependency
// (packages/shared/package.json), so instead of a hook it exports a plain
// store: an app binds it with React's own `useSyncExternalStore(subscribe,
// getSnapshot)` to render an offline banner, and feeds it from the same
// connectivity source it gives react-query (e.g. inside the subscribe passed
// to wireOnlineManager, also call onlineStore.setOnline). No UI, no lib.

export interface OnlineStore {
  getSnapshot(): boolean;
  subscribe(listener: () => void): () => void;
  setOnline(online: boolean): void;
}

export function createOnlineStore(initial = true): OnlineStore {
  let online = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOnline(next) {
      // No-op on an unchanged value: useSyncExternalStore bails out of a
      // re-render only if getSnapshot is stable, so skip notifying when nothing
      // changed rather than waking every subscriber on each duplicate ping.
      if (next === online) return;
      online = next;
      for (const listener of listeners) listener();
    },
  };
}

// Default singleton — assume online until a connectivity source says otherwise
// (same optimistic default as react-query's onlineManager).
export const onlineStore = createOnlineStore();
