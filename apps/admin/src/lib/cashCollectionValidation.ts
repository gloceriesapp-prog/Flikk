// Input for POST /api/cash-collections/settle (settle_rider_cash, migration 108).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSettleInput(body: unknown): { riderId: string; reference: string | null; collectionIds: string[] | null } | string {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  const { riderId, reference, collectionIds } = body as Record<string, unknown>;
  if (typeof riderId !== 'string' || !UUID.test(riderId)) return 'Choose a rider.';
  if (reference != null && typeof reference !== 'string') return 'Reference must be text.';
  const ref = typeof reference === 'string' ? reference.trim() : '';
  if (ref.length > 200) return 'Keep the reference under 200 characters.';
  if (collectionIds != null && (!Array.isArray(collectionIds) || collectionIds.length === 0 || collectionIds.length > 1000
    || !collectionIds.every((id) => typeof id === 'string' && UUID.test(id)))) return 'Choose the collections to settle.';
  return { riderId, reference: ref || null, collectionIds: (collectionIds as string[] | null | undefined) ?? null };
}
