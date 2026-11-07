// Copy for the Order placed screen, kept pure so every case is tested.

const rupees = (amount: number) => `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

// "₹245 paid via UPI" / "Pay ₹245 on delivery".
export function paymentLine(amount: number, paid: boolean, methodLabel: string): string {
  if (!paid) return `Pay ${rupees(amount)} on delivery`;
  const method = methodLabel.trim();
  return method && method.toLowerCase() !== 'online payment' ? `${rupees(amount)} paid via ${method}` : `${rupees(amount)} paid`;
}

// The arrival pill: the pre-order slot, else minutes from the delivery
// estimate (an absolute time wins over a duration), else a plain promise.
export function arrivalLine(
  { preorderLabel, estimatedDeliveryMinutes, estimatedDeliveryAt }:
  { preorderLabel?: string | null; estimatedDeliveryMinutes?: number | null; estimatedDeliveryAt?: string | null },
  now = Date.now(),
): string {
  if (preorderLabel) return `Delivers ${preorderLabel}`;
  const at = estimatedDeliveryAt ? Date.parse(estimatedDeliveryAt) : NaN;
  const minutes = Number.isFinite(at) ? Math.round((at - now) / 60_000) : estimatedDeliveryMinutes ?? null;
  if (minutes != null && minutes > 0) return `Arriving in ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  return 'Arriving soon';
}
