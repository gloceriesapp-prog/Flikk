export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}
