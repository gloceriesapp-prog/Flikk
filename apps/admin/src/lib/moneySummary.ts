// Revenue page's money split (admin_money_summary, migration
// 20261027120000): what customers paid, the store's share, rider pay, and
// what Gloceries keeps, plus what is still owed to stores and riders.

export type MoneyRange = 'today' | 'week' | 'month' | 'all';
export const MONEY_RANGES: { value: MoneyRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

export interface MoneyEarned {
  deliveries: number;
  customerPaid: number;
  itemSales: number;
  commission: number;
  platformFee: number;
  deliveryFees: number;
  riderPay: number;
  deliveryMargin: number;
  discounts: number;
  storeShare: number;
  net: number;
}

export interface StoreMoneyRow {
  storeId: string;
  name: string;
  periodSales: number;
  periodCommission: number;
  periodShare: number;
  owedTotal: number;
  paid: number;
  inPayouts: number;
  notBatched: number;
  outstanding: number;
}

export interface MoneySummary {
  range: MoneyRange;
  from: string | null;
  earned: MoneyEarned;
  stores: { owedTotal: number; paid: number; inPayouts: number; notBatched: number; outstanding: number; rows: StoreMoneyRow[] };
  riders: { owedTotal: number; paid: number; outstanding: number };
  cash: { withRiders: number; collections: number };
}

export function parseMoneyRange(value: string | null): MoneyRange {
  return MONEY_RANGES.some((range) => range.value === value) ? (value as MoneyRange) : 'month';
}

const IST_OFFSET_MS = 330 * 60 * 1000;

// Start of today / this week (Monday) / this month in India time, as a UTC
// instant. Weeks start Monday, matching payouts' week_start.
export function moneyRangeStart(range: MoneyRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear(), month = ist.getUTCMonth();
  let day = ist.getUTCDate();
  if (range === 'week') day -= (ist.getUTCDay() + 6) % 7;
  if (range === 'month') day = 1;
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS);
}

const num = (value: unknown) => Number(value ?? 0) || 0;

type RawSection = Record<string, unknown>;
export type MoneySummaryRow = { earned?: RawSection; stores?: RawSection & { rows?: RawSection[] }; riders?: RawSection; cash?: RawSection };

export function toMoneySummary(raw: MoneySummaryRow, range: MoneyRange, from: Date | null): MoneySummary {
  const earned = raw.earned ?? {};
  const stores = raw.stores ?? {};
  return {
    range,
    from: from?.toISOString() ?? null,
    earned: {
      deliveries: num(earned.deliveries), customerPaid: num(earned.customerPaid), itemSales: num(earned.itemSales),
      commission: num(earned.commission), platformFee: num(earned.platformFee), deliveryFees: num(earned.deliveryFees),
      riderPay: num(earned.riderPay), deliveryMargin: num(earned.deliveryMargin), discounts: num(earned.discounts),
      storeShare: num(earned.storeShare), net: num(earned.net),
    },
    stores: {
      owedTotal: num(stores.owedTotal), paid: num(stores.paid), inPayouts: num(stores.inPayouts),
      notBatched: num(stores.notBatched), outstanding: num(stores.outstanding),
      rows: (stores.rows ?? []).map((row) => ({
        storeId: String(row.storeId), name: String(row.name ?? 'Store'),
        periodSales: num(row.periodSales), periodCommission: num(row.periodCommission), periodShare: num(row.periodShare),
        owedTotal: num(row.owedTotal), paid: num(row.paid), inPayouts: num(row.inPayouts),
        notBatched: num(row.notBatched), outstanding: num(row.outstanding),
      })),
    },
    riders: { owedTotal: num(raw.riders?.owedTotal), paid: num(raw.riders?.paid), outstanding: num(raw.riders?.outstanding) },
    cash: { withRiders: num(raw.cash?.withRiders), collections: num(raw.cash?.collections) },
  };
}
