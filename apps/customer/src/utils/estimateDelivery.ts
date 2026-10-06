// Global default mirrors migration 061. The admin setting controls browsing;
// each order carries its own immutable deadline recorded by PostgreSQL.
export const DEFAULT_DELIVERY_MINUTES = 35;

export function deliveryMinutes(value: number | null | undefined): number {
  return value !== null && value !== undefined && Number.isInteger(value) && value >= 1 && value <= 240
    ? value : DEFAULT_DELIVERY_MINUTES;
}

export function estimateDeliveryTime(
  placedAt: string,
  estimatedMinutes?: number | null,
  estimatedDeliveryAt?: string | null,
): Date {
  const recorded = new Date(estimatedDeliveryAt ?? '');
  if (Number.isFinite(recorded.getTime())) return recorded;
  return new Date(new Date(placedAt).getTime() + deliveryMinutes(estimatedMinutes) * 60_000);
}

export function formatEta(eta: Date): string {
  if (!Number.isFinite(eta.getTime())) return 'Estimate unavailable';
  const now = new Date();
  const time = eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const dayOptions = { timeZone: 'Asia/Kolkata' };
  return eta.toLocaleDateString('en-IN', dayOptions) === now.toLocaleDateString('en-IN', dayOptions) ? `Today, ${time}` :
    `${eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}, ${time}`;
}
