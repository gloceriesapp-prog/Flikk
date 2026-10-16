// In-memory identity generation. Token rotation keeps the generation; logout
// and a new sign-in invalidate all reads, writes and private cached state.
let epoch = 0;
const listeners = new Set<() => void>();
export const getSessionEpoch = () => epoch;
export const isCurrentSession = (captured: number) => captured === epoch;
export function onSessionReset(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function resetSessionScope(): number {
  epoch += 1;
  for (const listener of listeners) listener();
  return epoch;
}
