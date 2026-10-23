import type { Payout } from '@/lib/partnerApi';
import { statusLabel } from '@/lib/format';

const descriptions: Record<Payout['status'], string> = {
  pending: 'This settlement is waiting to be processed.',
  processing: 'This settlement is being processed. It has not been marked paid yet.',
  paid: 'This settlement has been marked paid.',
  blocked: 'This settlement is blocked. Check the note below or contact support.',
  failed: 'This settlement failed. Check the note below or contact support.',
};

const colors: Record<Payout['status'], { text: string; dot: string }> = {
  pending: { text: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  processing: { text: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  paid: { text: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-600' },
  blocked: { text: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  failed: { text: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
};

export function PayoutStatus({ status }: { status: Payout['status'] }) {
  const color = colors[status];
  return <span title={descriptions[status]} className={`inline-flex w-fit items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${color.text}`}><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />{statusLabel(status)}</span>;
}

export function payoutStatusDescription(status: Payout['status']) { return descriptions[status]; }
