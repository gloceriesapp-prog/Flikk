export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// For chart axis ticks, where "₹12,450" would crowd the axis — "₹12.5K" instead.
export function formatInrCompact(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
}

// "500 g" / "1 kg" / "500 ml" / "1 L" / "2 pc" — display twin of backend/
// src/lib/products.ts's formatVariantUnit, kept independent since it's
// pure presentation (this file's whole job), not a write-path contract.
const VARIANT_UNIT_LABELS: Record<string, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

export function formatVariantSize(quantity: number, unitType: string): string {
  const qty = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, '');
  return `${qty}${VARIANT_UNIT_LABELS[unitType] ?? unitType}`;
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
