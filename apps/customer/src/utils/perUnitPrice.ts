// Computes a real "₹X/100 g" (or "/100 ml") line from a product's own
// weight string + price — never a hardcoded/fabricated per-unit number.
// Only weight/volume units (g, kg, ml, l) get a per-100 line; count-based
// units (pcs, dozen, pack) have no meaningful "per 100" equivalent, so
// this returns null for those rather than showing a nonsensical
// "₹X/100 pcs" — that's the "proper category" split this was asked for.

const WEIGHT_VOLUME_PATTERN = /^([\d.]+)\s*(kg|g|ml|l|litre|liter)s?\.?$/i;

export function getPerUnitPriceLabel(weight: string, price: number): string | null {
  const match = weight.trim().match(WEIGHT_VOLUME_PATTERN);
  if (!match) return null;

  const quantity = parseFloat(match[1]);
  if (!quantity || quantity <= 0) return null;

  const unit = match[2].toLowerCase();
  const isWeight = unit === 'g' || unit === 'kg';
  const baseQuantity = unit === 'kg' ? quantity * 1000 : unit === 'l' || unit === 'litre' || unit === 'liter' ? quantity * 1000 : quantity;

  const perHundred = (price / baseQuantity) * 100;
  const unitLabel = isWeight ? '100 g' : '100 ml';
  return `₹${perHundred.toFixed(1)}/${unitLabel}`;
}
