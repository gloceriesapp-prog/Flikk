// Accept decimal rupees explicitly; never remove punctuation and accidentally
// turn ₹14.50 into ₹1,450. Partial values are retained by the input component.
export const isMoneyInput = (value: string) => /^\d{0,7}(?:\.\d{0,2})?$/.test(value);
export function parseMoneyInput(value: string): number | null {
  if (!isMoneyInput(value) || value === '' || value === '.') return null;
  const [whole = '0', fraction = ''] = value.split('.');
  return (Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'))) / 100;
}
export function validVariantPrices(variants: { price: number; originalPrice?: number }[]): boolean {
  return variants.every(({ price, originalPrice }) => Number.isFinite(price) && price > 0 &&
    (originalPrice === undefined || (Number.isFinite(originalPrice) && originalPrice >= price)));
}
