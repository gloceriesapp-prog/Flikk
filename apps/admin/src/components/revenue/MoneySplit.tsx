// Revenue's money split. Three numbers that must never be mixed up:
// what Gloceries earned (ours to keep), what is owed to stores, and what is
// owed to riders. The top bar shows how one period's customer payments
// were divided; the balances underneath are everything still unpaid, all
// time, so a date filter can never hide money we owe.

import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight, Bike, Store, Wallet } from '@/components/icons';
import { formatCurrency, formatNumber, formatRupees } from '@/lib/format';
import { MONEY_RANGES, type MoneyRange, type MoneySummary } from '@/lib/moneySummary';

const SPLIT = [
  { key: 'storeShare', label: "Stores' share", bar: 'bg-ink' },
  { key: 'riderPay', label: 'Rider pay', bar: 'bg-[#b8bec8]' },
  { key: 'net', label: 'Gloceries kept', bar: 'bg-brand' },
] as const;

export function MoneySplit({ summary, range, onRangeChange }: {
  summary: MoneySummary | null;
  range: MoneyRange;
  onRangeChange: (range: MoneyRange) => void;
}) {
  const earned = summary?.earned;
  const paid = earned?.customerPaid ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Period" className="inline-flex rounded-[10px] border border-border p-0.5">
          {MONEY_RANGES.map((option) => (
            <button key={option.value} type="button" role="tab" aria-selected={range === option.value}
              onClick={() => onRangeChange(option.value)}
              className={clsx('rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                range === option.value ? 'bg-accent text-ink' : 'text-muted hover:text-ink')}>
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {earned ? `${formatNumber(earned.deliveries)} completed ${earned.deliveries === 1 ? 'delivery' : 'deliveries'}` : 'Loading…'}
        </p>
      </div>

      {/* Where the customers' money went */}
      <div className="card p-5">
        <p className="text-sm text-muted">Customers paid</p>
        <p className="text-3xl font-medium tabular-nums text-ink">{formatCurrency(paid)}</p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-accent">
          {earned && paid > 0 && SPLIT.map((part) => (
            <div key={part.key} className={part.bar} style={{ width: `${Math.max(0, (earned[part.key] / paid) * 100)}%` }} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SPLIT.map((part) => (
            <div key={part.key}>
              <div className="flex items-center gap-2">
                <span className={clsx('h-2 w-2 rounded-full', part.bar)} />
                <p className="text-sm text-muted">{part.label}</p>
              </div>
              <p className="mt-0.5 text-xl font-medium tabular-nums text-ink">{formatCurrency(earned?.[part.key] ?? 0)}</p>
              <p className="text-xs text-muted">{paid > 0 && earned ? `${Math.round((earned[part.key] / paid) * 100)}% of what customers paid` : '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ours */}
        <div className="card p-5">
          <CardHead icon={Wallet} title="Gloceries earned" hint="Ours to keep" />
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            <Line label="Commission from stores" value={earned?.commission} />
            <Line label="Platform fee from customers" value={earned?.platformFee} />
            <Line label="Delivery margin" value={earned?.deliveryMargin}
              hint={earned ? `${formatCurrency(earned.deliveryFees)} fees − ${formatCurrency(earned.riderPay)} rider pay` : undefined} />
            <Line label="Promo discounts we paid" value={earned ? -earned.discounts : undefined} />
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <p className="text-sm font-semibold text-ink">Net earned</p>
            <p className={clsx('text-xl font-semibold tabular-nums', (earned?.net ?? 0) < 0 ? 'text-danger' : 'text-ink')}>
              {formatRupees(earned?.net ?? 0)}
            </p>
          </div>
        </div>

        {/* Stores */}
        <div className="card p-5">
          <CardHead icon={Store} title="To pay stores" hint="Not ours: all time, unpaid" />
          <p className="mt-4 text-2xl font-semibold tabular-nums text-ink">{formatRupees(summary?.stores.outstanding ?? 0)}</p>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            <Line label="In weekly payouts, unpaid" value={summary?.stores.inPayouts} />
            <Line label="Delivered, not in a payout yet" value={summary?.stores.notBatched} />
            <Line label="Paid so far" value={summary?.stores.paid} muted />
          </dl>
          <PayoutsLink />
        </div>

        {/* Riders */}
        <div className="card p-5">
          <CardHead icon={Bike} title="To pay riders" hint="Not ours: all time, unpaid" />
          <p className="mt-4 text-2xl font-semibold tabular-nums text-ink">{formatRupees(summary?.riders.outstanding ?? 0)}</p>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            <Line label="Paid so far" value={summary?.riders.paid} muted />
            <Line label="Cash riders still hold (COD)" value={summary?.cash.withRiders}
              hint={summary ? `${formatNumber(summary.cash.collections)} unsettled collections — collect before paying out` : undefined} />
          </dl>
          <PayoutsLink />
        </div>
      </div>

      {/* Per store */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-ink">Per store</h3>
          <p className="text-xs text-muted">Sales, commission and the store&apos;s share for this period; paid and still owed are all time.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-4">Store</th>
                <th className="pb-3 pr-4 text-right">Sales</th>
                <th className="pb-3 pr-4 text-right">Our commission</th>
                <th className="pb-3 pr-4 text-right">Store&apos;s share</th>
                <th className="pb-3 pr-4 text-right">Paid (all time)</th>
                <th className="pb-3 text-right">Still owed</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.stores.rows ?? []).map((row) => (
                <tr key={row.storeId} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-ink">{row.name}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatRupees(row.periodSales)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatRupees(row.periodCommission)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatRupees(row.periodShare)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted">{formatRupees(row.paid)}</td>
                  <td className={clsx('py-3 text-right font-semibold tabular-nums', row.outstanding > 0 ? 'text-ink' : 'text-muted')}>{formatRupees(row.outstanding)}</td>
                </tr>
              ))}
              {summary && summary.stores.rows.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-sm text-muted">No delivered orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CardHead({ icon: Icon, title, hint }: { icon: typeof Wallet; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-ink"><Icon size={16} /></span>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}

function Line({ label, value, hint, muted }: { label: string; value: number | undefined; hint?: string; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-ink-soft">{label}</dt>
        <dd className={clsx('tabular-nums', muted ? 'text-muted' : 'text-ink', (value ?? 0) < 0 && 'text-danger')}>{formatRupees(value ?? 0)}</dd>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function PayoutsLink() {
  return (
    <Link href="/payouts" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:underline">
      Go to payouts <ArrowRight size={14} />
    </Link>
  );
}
