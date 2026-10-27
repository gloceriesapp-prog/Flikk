'use client';

// Revenue — where every rupee customers paid went: the stores' share, rider
// pay, and what Gloceries kept, with what is still owed to stores and
// riders kept separate from our earnings (components/revenue/MoneySplit).
// Paying stores and riders happens on the Payouts page (manual UTR flow,
// backend/PAYOUTS.md).

import { useCallback, useEffect, useState } from 'react';
import { MoneySplit } from '@/components/revenue/MoneySplit';
import { OrderTransactionsTable } from '@/components/revenue/OrderTransactionsTable';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { MoneyRange, MoneySummary } from '@/lib/moneySummary';
import type { Order } from '@/lib/types';

export default function RevenuePage() {
  const [range, setRange] = useState<MoneyRange>('month');
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        fetch(`/api/money-summary?range=${range}`),
        fetch('/api/orders'),
      ]);
      if (!summaryRes.ok) throw new Error((await summaryRes.json()).error ?? 'Could not load the money summary.');
      if (!ordersRes.ok) throw new Error((await ordersRes.json()).error ?? 'Could not load orders.');
      setSummary(await summaryRes.json());
      setOrders(await ordersRes.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load revenue data.');
    }
  }, [range]);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useAdminRealtime(loadData);

  const ordersByRecency = [...orders].reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Revenue</h1>
        <p className="page-subtitle">What Gloceries earned, kept apart from what we owe stores and riders.</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <MoneySplit summary={summary} range={range} onRangeChange={setRange} />

      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-ink">Order transactions</h3>
          <p className="text-xs text-muted">Every order, its total, and the commission Gloceries earned from it.</p>
        </div>
        <OrderTransactionsTable orders={ordersByRecency} />
      </div>
    </div>
  );
}
