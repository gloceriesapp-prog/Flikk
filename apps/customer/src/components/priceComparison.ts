export function priceComparison(price: number, originalPrice?: number) {
  const mrp = Number.isFinite(price) && Number.isFinite(originalPrice) && originalPrice! > price && price >= 0 ? originalPrice : undefined;
  return { mrp, discount: mrp === undefined ? undefined : Math.round((1 - price / mrp) * 100) };
}

// Preserve real savings below one percent rather than hiding or overstating them.
export function discountPercentLabel(price: number, originalPrice?: number): string | undefined {
  const { mrp, discount } = priceComparison(price, originalPrice);
  if (mrp === undefined) return undefined;
  return (mrp - price) / mrp * 100 < 1 ? '<1' : String(discount);
}
