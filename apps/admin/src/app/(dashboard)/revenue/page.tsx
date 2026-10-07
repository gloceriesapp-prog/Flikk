'use client';

// Revenue — how much money the platform actually made (commission trend +
// platform fee), and every order's transaction. What's owed back out to
// stores and riders is paid and recorded on the Payouts page (manual UTR
// flow, backend/PAYOUTS.md); this page only shows that pending total.

import { useCallback, useEffect, useState } from 'react';
import { RevenueBalanceCard } from '@/components/revenue/RevenueBalanceCard';
import { OrderTransactionsTable } from '@/components/revenue/OrderTransactionsTable';
import { sumRupees } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { AdminPayoutRow, Order, RevenuePoint } from '@/lib/types';

export default function RevenuePage() {
  const [pendingPayouts, setPendingPayouts] = useState<AdminPayoutRow[] | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [payoutsRes, trendRes, ordersRes, settingsRes] = await Promise.all([
        fetch('/api/payouts?status=pending'),
        fetch('/api/revenue-trend'),
        fetch('/api/orders'),
        fetch('/api/platform-settings'),
      ]);
      if (!payoutsRes.ok) throw new Error((await payoutsRes.json()).error ?? 'Could not load payouts.');
      if (!trendRes.ok) throw new Error((await trendRes.json()).error ?? 'Could not load revenue trend.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      setPendingPayouts(await payoutsRes.json());
      setTrend(await trendRes.json());
      setOrders(await ordersRes.json());
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

  const pendingTotal = pendingPayouts ? sumRupees(pendingPayouts.map((p) => p.netAmount)) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Revenue</h1>
          <p className="text-sm text-muted">How much Gloceries earned, and what&apos;s owed back to stores and riders.</p>
        </div>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <RevenueBalanceCard
        totalRevenue={totalRevenue}
        totalCommission={totalCommission}
        totalPlatformFee={totalPlatformFee}
        thisWeek={latestTotal}
        weekOverWeekPct={weekOverWeekPct}
        pendingPayouts={pendingTotal}
        commissionRate={commissionRate}
      />

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-ink">Order transactions</h3>
          <p className="text-xs text-muted">Every order, its total, and the commission Gloceries earned from it.</p>
        </div>
        <OrderTransactionsTable orders={ordersByRecency} />
      </div>
    </div>
  );
}
