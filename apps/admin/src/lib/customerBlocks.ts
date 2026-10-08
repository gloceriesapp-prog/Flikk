// Customer block durations (admin customer page) and the "is this block
// still in force" rule shared by the list and detail routes.

export type BlockDuration = '24h' | '7d' | '30d' | 'indefinite';

export const BLOCK_DURATIONS: { value: BlockDuration; label: string; hours: number | null }[] = [
  { value: 'indefinite', label: 'Until unblocked', hours: null },
  { value: '24h', label: '24 hours', hours: 24 },
  { value: '7d', label: '7 days', hours: 24 * 7 },
  { value: '30d', label: '30 days', hours: 24 * 30 },
];

export interface CustomerBlockRow {
  user_id: string;
  reason: string;
  blocked_at: string;
  blocked_until: string | null;
  unblocked_at: string | null;
}

export interface CustomerBlockInfo {
  reason: string;
  blockedAt: string;
  blockedUntil: string | null;
}

// The customer search text goes into a PostgREST .or() filter string, where
// , ( ) . " \ * and % are syntax or wildcards — a raw "a,b" or "(" made the
// whole request 500. Keep only what a name or phone search needs.
export function sanitizeCustomerSearch(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} +'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

export function activeBlock(row: CustomerBlockRow | null | undefined, now = Date.now()): CustomerBlockInfo | null {
  if (!row || row.unblocked_at) return null;
  if (row.blocked_until && Date.parse(row.blocked_until) <= now) return null;
  return { reason: row.reason, blockedAt: row.blocked_at, blockedUntil: row.blocked_until };
}
