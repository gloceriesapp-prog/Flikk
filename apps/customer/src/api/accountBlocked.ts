// Admin-blocked account signal (backend 403 ACCOUNT_BLOCKED). api/client.ts
// signs the session out and publishes the message here; RootNavigator shows
// it. Kept free of react-native imports so the API client stays testable.

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function onAccountBlocked(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishAccountBlocked(message: string): void {
  for (const listener of listeners) listener(message);
}
