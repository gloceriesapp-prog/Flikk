// Deterministic (non-random) avatar initials + color for a person row —
// no photo data exists for customers, so this is a real stand-in derived
// from their own name, same idea as Sidebar's dicebear-seeded avatar.
// Shared by the Overview "Recent orders" table and the Orders section.
export const AVATAR_PALETTE = [
  'bg-blue-50 text-blue-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-600',
  'bg-emerald-50 text-emerald-600',
  'bg-rose-50 text-rose-600',
];

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function avatarColorFor(seed: string): string {
  const hash = [...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
