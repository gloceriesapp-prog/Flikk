const PRESENTATIONS = {
  placed: { label: 'Placed', style: 'bg-accent text-ink-soft' },
  packed: { label: 'Packed', style: 'bg-amber-50 text-amber-700' },
  out_for_delivery: { label: 'In transit', style: 'bg-blue-50 text-blue-700' },
  delivered: { label: 'Delivered', style: 'bg-green-50 text-success' },
  cancelled: { label: 'Cancelled', style: 'bg-red-50 text-danger' },
  failed: { label: 'Delivery failed', style: 'bg-orange-50 text-orange-700' },
} as const;
export function orderStatusPresentation(status: string) {
  return Object.hasOwn(PRESENTATIONS, status)
    ? PRESENTATIONS[status as keyof typeof PRESENTATIONS]
    : { label: 'Unknown status', style: 'bg-accent text-muted' };
}
