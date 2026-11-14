// Display exact, confirmed integer stock only. Unknown stock is not scarcity.
export function stockLabel(quantity?: number, available = true): string {
  return available && Number.isInteger(quantity) && quantity! >= 1 && quantity! <= 5 ? `${quantity} left` : '';
}
