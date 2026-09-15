export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  blocked: 'Blocked',
  failed: 'Failed',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-700',
  packed: 'bg-amber-50 text-amber-700',
  out_for_delivery: 'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  blocked: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-neutral-100 text-neutral-700';
}
