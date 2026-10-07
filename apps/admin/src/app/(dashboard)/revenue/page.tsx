'use client';

// Revenue — how much money the platform actually made (commission trend),
// distinct from Payouts (A4/FR23, what each store is owed from that same
// money), Transactions (the actual weekly release of that money — manual
// today, see SETTLEMENT_CADENCE_LABEL's own note in mock-data.ts on why),
// and Settlement History (A4's paid-cycle log) — four related views,
// tabbed on one screen since they're all "the money" to a founder.
//
// Real data now: app/api/payouts (payouts table), app/api/revenue-trend
// (weekly commission from delivered orders), app/api/orders (already
// real, shared with Orders page), and app/api/balance (already real,
// shared with Overview's BalanceSummaryCard). "Release" now actually
// writes to payouts via PATCH /api/payouts instead of only flipping local
// state.

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import { PayoutsTable } from '@/components/revenue/PayoutsTable';
import { RevenueBalanceCard } from '@/components/revenue/RevenueBalanceCard';
import { OrderTransactionsTable } from '@/components/revenue/OrderTransactionsTable';
import type { BalanceSummary } from '@/components/dashboard/BalanceSummaryCard';
import { formatCurrency, formatNumber } from '@/lib/format';
import { AUTO_RELEASE_ENABLED, SETTLEMENT_CADENCE_LABEL } from '@/lib/mock-data';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Order, Payout, RevenuePoint } from '@/lib/types';

const TABS = ['Overview', 'Payouts', 'Transactions', 'Settlement history'] as const;

export default function RevenuePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [payoutsRes, trendRes, ordersRes, balanceRes, settingsRes] = await Promise.all([
        fetch('/api/payouts'),
        fetch('/api/revenue-trend'),
        fetch('/api/orders'),
        fetch('/api/balance'),
        fetch('/api/platform-settings'),
      ]);
      if (!payoutsRes.ok) throw new Error((await payoutsRes.json()).error ?? 'Could not load payouts.');
      if (!trendRes.ok) throw new Error((await trendRes.json()).error ?? 'Could not load revenue trend.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      setPayouts(await payoutsRes.json());
      setTrend(await trendRes.json());
      setOrders(await ordersRes.json());
      if (balanceRes.ok) setBalance(await balanceRes.json());
      if (settingsRes.ok) setCommissionRate((await settingsRes.json()).commissionRate);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load revenue data.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useAdminRealtime(loadData);

  // Real total earnings = commission (from stores) + platform/handling fee
  // (from customers) — both are money Gloceries actually keeps, neither is
  // ever paid to a store or a rider. app/api/revenue-trend's own note has
  // the full reasoning.
  const totalCommission = trend.reduce((sum, p) => sum + p.commission, 0);
  const totalPlatformFee = trend.reduce((sum, p) => sum + p.platformFee, 0);
  const totalRevenue = totalCommission + totalPlatformFee;
  const latest = trend[trend.length - 1];
  const prior = trend[trend.length - 2];
  const latestTotal = latest ? latest.commission + latest.platformFee : 0;
  const priorTotal = prior ? prior.commission + prior.platformFee : 0;
  const weekOverWeekPct = priorTotal > 0 ? Math.round(((latestTotal - priorTotal) / priorTotal) * 100) : 0;

  const ordersByRecency = [...orders].reverse();

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const paidPayouts = payouts.filter((p) => p.status === 'paid');
  const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.netPayout, 0);

  async function handleMarkPaid(id: string, reference: string) {
    const res = await fetch('/api/payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reference }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not mark this payout paid.');
    await loadData();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Revenue</h1>
          <p className="text-sm text-muted">How much Gloceries earned, and what&apos;s owed back to stores.</p>
        </div>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <RevenueBalanceCard
        totalRevenue={totalRevenue}
        totalCommission={totalCommission}
        totalPlatformFee={totalPlatformFee}
        thisWeek={latestTotal}
        weekOverWeekPct={weekOverWeekPct}
        wallet={balance}
        commissionRate={commissionRate}
      />

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t}
            {t === 'Payouts' && pendingPayouts.length > 0 && (
              <span
                className={clsx(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  tab === t ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700',
                )}
              >
                {pendingPayouts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-ink">Order transactions</h3>
              <p className="text-xs text-muted">Every order, its total, and the commission Gloceries earned from it.</p>
            </div>
            <OrderTransactionsTable orders={ordersByRecency} />
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-ink">Payroll transactions — pending</h3>
                <p className="text-xs text-muted">Awaiting release, with each store&apos;s payout bank account.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {formatCurrency(pendingTotal)} across {pendingPayouts.length}
              </span>
            </div>
            <PayoutsTable payouts={pendingPayouts} emptyLabel="Nothing pending — everyone's been paid." />
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-ink">Payroll transactions — completed</h3>
              <p className="text-xs text-muted">Already settled, with when and where each payout landed.</p>
            </div>
            <PayoutsTable payouts={paidPayouts} emptyLabel="No settlements recorded yet." />
          </div>
        </div>
      )}

      {tab === 'Payouts' && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Pending this cycle</h3>
          <PayoutsTable payouts={pendingPayouts} emptyLabel="Nothing pending — everyone's been paid." onMarkPaid={handleMarkPaid} />
        </div>
      )}

      {tab === 'Transactions' && (
        <div className="flex flex-col gap-4">
          {/* Weekly release — no payout-gateway automation exists yet, so
              this is the real mechanism: a founder reviews what's pending
              and releases it themselves, same cadence a payroll run would
              follow. */}
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
                  <CalendarClock size={18} className="text-ink" />
                </div>
                <div>
                  <p className="text-base font-medium text-ink">Weekly settlement</p>
                  <p className="text-sm text-muted">{SETTLEMENT_CADENCE_LABEL}</p>
                  <span
                    className={clsx(
                      'mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      AUTO_RELEASE_ENABLED ? 'bg-green-50 text-success' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {AUTO_RELEASE_ENABLED ? 'Auto-release on' : 'Manual release — no gateway automation yet'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted">Ready to release</p>
                <p className="text-2xl font-medium tabular-nums text-ink">{formatCurrency(pendingTotal)}</p>
                <p className="text-xs text-muted">
                  across {formatNumber(pendingPayouts.length)} store{pendingPayouts.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
              Pay each store from your bank or UPI app, then press <span className="font-medium text-ink">Mark paid</span> on
              its row and enter the transaction reference (UTR). Each payout is recorded separately, so a failed
              transfer stays pending.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium text-ink">Pending release</h3>
            <PayoutsTable payouts={pendingPayouts} emptyLabel="Nothing pending — this week's already settled." onMarkPaid={handleMarkPaid} />
          </div>
        </div>
      )}

      {tab === 'Settlement history' && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Paid settlements</h3>
          <PayoutsTable payouts={paidPayouts} emptyLabel="No settlements recorded yet." />
        </div>
      )}
    </div>
  );
}
