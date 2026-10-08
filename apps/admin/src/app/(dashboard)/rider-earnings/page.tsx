'use client';

// Rider earnings — the per-delivery ledger behind the weekly rider payouts:
// every rider_earnings row (rider, order/trip, base, extra-stop share, amount,
// date, paid status) with rider and date filters, plus weekly totals for the
// same filter (app/api/rider-earnings). Paged server-side, so the full
// history is reachable. Paying still happens on the Payouts page.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDateTime, formatRupees } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { ActiveRider, RiderEarningPaidStatus, RiderEarningRow, RiderEarningWeek } from '@/lib/types';

const STATUS_STYLE: Record<RiderEarningPaidStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-green-50 text-success' },
  in_payout: { label: 'In payout', className: 'bg-blue-50 text-blue-700' },
  unpaid: { label: 'Unpaid', className: 'bg-amber-50 text-amber-700' },
};

function weekLabel(start: string): string {
  const begin = new Date(`${start}T00:00:00`);
  const end = new Date(begin.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(begin)} – ${fmt(end)}`;
}

interface LedgerResponse {
  items: RiderEarningRow[];
  total: number;
  page: number;
  pageSize: number;
  weeks: RiderEarningWeek[];
  weeksTruncated: boolean;
}

export default function RiderEarningsPage() {
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [rider, setRider] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/riders')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ActiveRider[]) => setRiders(list))
      .catch(() => setRiders([]));
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (rider) params.set('rider', rider);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      const res = await fetch(`/api/rider-earnings?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load rider earnings.');
      setData(body as LedgerResponse);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load rider earnings.');
    } finally {
      setLoading(false);
    }
  }, [rider, from, to, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  const items = data?.items ?? [];
  const weeks = data?.weeks ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const weeksTotal = weeks.reduce((sum, w) => sum + Math.round(w.total * 100), 0) / 100;
  const weeksUnpaid = weeks.reduce((sum, w) => sum + Math.round(w.unpaid * 100), 0) / 100;

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Rider earnings</h1>
        <p className="text-sm text-muted">Every delivery a rider was paid for, with the base and extra-stop split and whether it has been paid out.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={rider}
          onChange={(e) => resetPage(setRider)(e.target.value)}
          aria-label="Rider"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink"
        >
          <option value="">All riders</option>
          {[...riders].sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
            <option key={r.userId} value={r.userId}>
              {r.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          From
          <input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} className="rounded-full border border-border bg-card px-3 py-2 text-sm text-ink" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          To
          <input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} className="rounded-full border border-border bg-card px-3 py-2 text-sm text-ink" />
        </label>
        {(rider || from || to) && (
          <button
            type="button"
            onClick={() => {
              setRider('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="text-xs font-semibold text-ink-soft hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Weekly totals</h3>
          <p className="text-xs text-muted">
            {from || to ? 'For the selected dates' : 'Last 12 weeks'} · {formatRupees(weeksTotal)} earned · {formatRupees(weeksUnpaid)} not paid yet
          </p>
        </div>
        {data?.weeksTruncated ? (
          <p className="text-sm text-muted">Pick a range of 400 days or less to see weekly totals.</p>
        ) : weeks.length === 0 ? (
          <p className="text-sm text-muted">No earnings in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">Week (Mon–Sun)</th>
                  <th className="py-2 pr-4 text-right font-medium">Deliveries</th>
                  <th className="py-2 pr-4 text-right font-medium">Base</th>
                  <th className="py-2 pr-4 text-right font-medium">Extra stops</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  <th className="py-2 text-right font-medium">Not paid yet</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.weekStart} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{weekLabel(w.weekStart)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{w.deliveries}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatRupees(w.base)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatRupees(w.extra)}</td>
                    <td className="py-2 pr-4 text-right font-semibold tabular-nums text-ink">{formatRupees(w.total)}</td>
                    <td className={clsx('py-2 text-right tabular-nums', w.unpaid > 0 ? 'text-amber-700' : 'text-muted')}>{formatRupees(w.unpaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Rider</th>
              <th className="p-4 font-medium">Order / trip</th>
              <th className="p-4 text-right font-medium">Base</th>
              <th className="p-4 text-right font-medium">Extra stops</th>
              <th className="p-4 text-right font-medium">Amount</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="p-4 text-ink-soft">{e.earnedAt ? formatDateTime(e.earnedAt) : '—'}</td>
                <td className="p-4 font-medium text-ink">{e.riderName}</td>
                <td className="p-4">
                  <Link href={`/orders/${e.orderId}`} className="font-medium text-ink hover:underline">
                    #{(e.tripId ?? e.orderId).slice(0, 6).toUpperCase()}
                  </Link>
                  <p className="text-xs text-muted">{e.tripId ? 'Trip' : 'Order'}</p>
                </td>
                <td className="p-4 text-right tabular-nums">{formatRupees(e.baseAmount)}</td>
                <td className="p-4 text-right tabular-nums">{formatRupees(e.extraStopAmount)}</td>
                <td className="p-4 text-right font-semibold tabular-nums text-ink">{formatRupees(e.amount)}</td>
                <td className="p-4">
                  <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_STYLE[e.status].className)}>
                    {STATUS_STYLE[e.status].label}
                  </span>
                  {e.paidAt && <p className="mt-1 text-xs text-muted">{formatDateTime(e.paidAt)}</p>}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">
                  No rider earnings for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">{data ? `${data.total} deliveries` : ''}</span>
        {pages > 1 && (
          <div className="flex items-center gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-border bg-card px-4 py-2 disabled:opacity-40">
              Previous
            </button>
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-border bg-card px-4 py-2 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
