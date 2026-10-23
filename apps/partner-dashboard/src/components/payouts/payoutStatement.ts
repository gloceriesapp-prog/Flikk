import type { Payout } from '../../lib/partnerApi';

export function payoutMoney(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Effective rate of this recorded settlement, not today's configured rate.
export function payoutCommission(payout: Pick<Payout, 'gross_amount' | 'commission_deducted'>): string {
  const amount = `−${payoutMoney(payout.commission_deducted)}`;
  if (!(payout.gross_amount > 0) || !Number.isFinite(payout.gross_amount) || !Number.isFinite(payout.commission_deducted)) return amount;
  const rate = payout.commission_deducted / payout.gross_amount * 100;
  const rounded = Math.round(rate * 100) / 100;
  const approximate = Math.abs(rate - rounded) > 0.000001 ? '≈' : '';
  return `${approximate}${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })}% = ${amount}`;
}

export function payoutStatementCsv(payout: Payout): string {
  const fields = [
    ['Payout ID', 'Period start', 'Period end', 'Gross (INR)', 'Commission (INR)', 'Net payout (INR)', 'Status', 'Paid at', 'Note'],
    [payout.id, payout.week_start, payout.week_end, payout.gross_amount.toFixed(2), payout.commission_deducted.toFixed(2), payout.net_payout.toFixed(2), payout.status, payout.paid_at ?? '', payout.payment_note ?? ''],
  ];
  // Quoting alone does not stop a spreadsheet from evaluating a formula.
  return fields.map(row => row.map(value => `"${(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export function downloadPayoutStatement(payout: Payout) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', payoutStatementCsv(payout)], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `payout-${payout.week_start.slice(0, 10)}-${payout.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
