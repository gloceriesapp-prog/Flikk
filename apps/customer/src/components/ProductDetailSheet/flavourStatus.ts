import { stockLabel } from '../stockLabel';

// Flavours share product inventory; an unselected flavour still shows stock.
export function flavourStatus(available: boolean, selected: boolean, quantity?: number): string {
  if (!available) return 'Out of stock';
  return [selected ? 'Selected' : '', stockLabel(quantity)].filter(Boolean).join(' · ');
}
