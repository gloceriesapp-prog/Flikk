// Real delivery-time text when it exists (avg_prep_minutes), otherwise one
// of a few honest, non-numeric lines instead of literally repeating
// "Delivery time varies" on every single card with no prep time set yet
// (most stores, right now) — per an explicit ask. djb2 hash picks the same
// line for the same store on every render/session (deterministic, not
// Math.random()), same trick StoreCard.tsx's own earlier dummy-data pass
// already used for exactly this reason: varied, but not flickering on
// every re-render.
//
// Every fallback line is a true, generic statement about how the app
// works (no specific minute/hour claim) — never a fabricated number the
// way a fake "~15 min" would be for a store with no real prep time on
// file.

function hashString(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return hash;
}

const FALLBACK_MESSAGES = [
  'Fresh picks from your neighbourhood store',
  'Order now, delivered today',
  'Everyday essentials, just a tap away',
  'Real stock, from a real local shop',
];

export function getDeliveryMessage(storeId: string, avgPrepMinutes?: number): string {
  if (avgPrepMinutes) return `Delivers in ~${avgPrepMinutes} min`;
  return FALLBACK_MESSAGES[hashString(storeId) % FALLBACK_MESSAGES.length];
}
