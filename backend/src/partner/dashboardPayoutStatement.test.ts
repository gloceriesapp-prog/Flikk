import { expect, it } from 'vitest';
import { payoutMoney, payoutStatementCsv, payoutCommission } from '../../../apps/partner-dashboard/src/components/payouts/payoutStatement';
import type { Payout } from '../../../apps/partner-dashboard/src/lib/partnerApi';

const payout: Payout = { id: 'payout-1', store_id: 'store-1', week_start: '2026-10-12', week_end: '2026-10-18', gross_amount: 537, commission_deducted: 53.7, net_payout: 483.3, status: 'processing', paid_at: null };
it('preserves paise in payout amounts and statements', () => {
  expect(payoutMoney(483.3)).toBe('₹483.30');
  expect(payoutStatementCsv(payout)).toContain('"537.00","53.70","483.30"');
});
it('exports recorded settlement values without recomputing historical commission', () => {
  const csv = payoutStatementCsv({ ...payout, commission_deducted: 49.99, net_payout: 487.01 });
  expect(csv).toContain('"49.99","487.01"');
  expect(csv).toContain('"processing","",""');
});
it('escapes quoted notes and prevents spreadsheet formula execution', () => {
  expect(payoutStatementCsv({ ...payout, payment_note: ' =HYPERLINK("example")' })).toContain('"\' =HYPERLINK(""example"")"');
});

it('uses the historical effective commission and handles zero gross safely', () => {
  expect(payoutCommission({ gross_amount: 3420, commission_deducted: 342 })).toBe('10% = −₹342');
  expect(payoutCommission({ gross_amount: 1000, commission_deducted: 85 })).toBe('8.5% = −₹85');
  expect(payoutCommission({ gross_amount: 3, commission_deducted: 1 })).toBe('≈33.33% = −₹1');
  expect(payoutCommission({ gross_amount: 0, commission_deducted: 0 })).toBe('−₹0');
});
