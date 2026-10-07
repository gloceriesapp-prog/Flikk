// Plain-text receipt for the E-Receipt "Download" button — shared through
// the native share sheet (save to Files/Notes, WhatsApp, email). No PDF
// dependency is installed; add expo-print when a PDF is genuinely needed.

interface ReceiptLine {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptInput {
  orderNumber: string;
  placedAt: string;
  paymentMethodLabel: string;
  deliveryAddress: string;
  items: ReceiptLine[];
  total: number;
}

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildReceiptText({ orderNumber, placedAt, paymentMethodLabel, deliveryAddress, items, total }: ReceiptInput): string {
  // Same derivation as ReceiptCard: the charged total is the source of truth.
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const placed = new Date(placedAt);
  return [
    'Gloceries — E-Receipt',
    `Order: ${orderNumber}`,
    `Date: ${placed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}`,
    `Payment: ${paymentMethodLabel}`,
    `Deliver to: ${deliveryAddress}`,
    '',
    ...items.map((item) => `${item.name} × ${item.quantity} — ${rupees(item.price * item.quantity)}`),
    '',
    `Item total: ${rupees(itemTotal)}`,
    `Delivery & handling: ${rupees(Math.max(total - itemTotal, 0))}`,
    `Total: ${rupees(total)}`,
  ].join('\n');
}
