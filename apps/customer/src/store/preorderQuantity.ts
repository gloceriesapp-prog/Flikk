/** Minimum order counts are packs; labels show the actual weight or piece count. */
export function preorderMinimumLabel(count: number, size: string): string {
  const match = size.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs?|pieces?)$/i);
  if (!match || Number(match[1]) <= 0) return `Minimum ${count} packs`;
  let amount = Number(match[1]) * count;
  let unit = match[2]!.toLowerCase();
  if (/^(pc|pcs|piece|pieces)$/.test(unit)) unit = 'pc';
  if (unit === 'g' && amount >= 1000) { amount /= 1000; unit = 'kg'; }
  if (unit === 'l') unit = 'L';
  return `Minimum ${Number(amount.toFixed(3))} ${unit}`;
}
