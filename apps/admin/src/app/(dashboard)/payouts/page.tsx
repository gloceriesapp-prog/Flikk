'use client';

// Payouts — weekly store + rider payouts, paid manually by the founder
// (UPI app / net banking) and recorded one row at a time with the UTR.
// No bulk "mark all paid", no payout gateway. Contract: backend/PAYOUTS.md.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileImage } from 'lucide-react';
import clsx from 'clsx';
import { MarkPaidModal } from '@/components/payouts/MarkPaidModal';
import { formatDateTime, formatRupees, sumRupees } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { AdminPayoutRow } from '@/lib/types';

type Tab = 'pending' | 'paid';
type KindFilter = 'all' | 'store' | 'rider';

function weekLabel(start: string, end: string): string {
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function CopyButton({ value, label }: { value: string | null; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted">—</span>;
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-mono text-xs text-ink hover:bg-accent"
    >
      {value}
      <Copy size={11} className={copied ? 'text-success' : 'text-muted'} />
    </button>
  );
}

function csvCell(v: string | number | null): string {
  const s = v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function PayoutsPage() {
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [kind, setKind] = useState<KindFilter>('all');
  const [week, setWeek] = useState<string | null>(null); // week_start; null = not chosen yet
  const [paying, setPaying] = useState<AdminPayoutRow | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/payouts?status=all');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load payouts.');
      setRows(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load payouts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  useAdminRealtime(load);

  const weeks = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.weekStart, r.weekEnd);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  // Default: latest week that still has something pending, else the latest week.
  const selectedWeek = week ?? rows.find((r) => r.status !== 'paid')?.weekStart ?? weeks[0]?.[0] ?? 'all';

  const visible = rows.filter(
    (r) =>
      (tab === 'paid' ? r.status === 'paid' : r.status !== 'paid') &&
      (kind === 'all' || r.kind === kind) &&
      (selectedWeek === 'all' || r.weekStart === selectedWeek),
  );
  const pendingInView = rows.filter(
    (r) => r.status !== 'paid' && (kind === 'all' || r.kind === kind) && (selectedWeek === 'all' || r.weekStart === selectedWeek),
  );
  const payeeKey = (r: AdminPayoutRow) => `${r.kind}:${r.payeeId}`;
  const pendingTotal = sumRupees(pendingInView.map((r) => r.netAmount));
  const payeeCount = new Set(pendingInView.map(payeeKey)).size;
  const unverifiedCount = new Set(pendingInView.filter((r) => r.verification !== 'verified').map(payeeKey)).size;

  async function viewProof(row: AdminPayoutRow) {
    setProofError(null);
    const res = await fetch(`/api/payees/${row.kind}/${row.payeeId}/proof`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.url) {
      setProofError(body?.error ?? 'Could not open proof.');
      return;
    }
    window.open(body.url, '_blank', 'noopener,noreferrer');
  }

  function exportCsv() {
    const header = ['Type', 'Payee', 'Phone', 'Method', 'UPI ID', 'Account number', 'IFSC', 'Bank', 'Holder name', 'Verified', 'Amount', 'Week start', 'Week end'];
    const lines = pendingInView.map((r) =>
      [r.kind, r.payeeName, r.phone, r.method, r.upiId, r.accountNumber, r.ifsc, r.bankName, r.accountHolderName, r.verification, r.netAmount.toFixed(2), r.weekStart, r.weekEnd]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pending-payouts-${selectedWeek}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-ink">Payouts</h1>
          <p className="text-sm text-muted">Pay each store and rider from your UPI/bank app, then record the UTR here.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={pendingInView.length === 0}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink hover:bg-accent disabled:opacity-40"
        >
          <Download size={15} />
          Export pending CSV
        </button>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {proofError && <p className="text-sm text-danger">{proofError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Total pending</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatRupees(pendingTotal)}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Payees to pay</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{payeeCount}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted">Unverified accounts</p>
          <p className={clsx('mt-1 text-2xl font-bold tabular-nums', unverifiedCount > 0 ? 'text-amber-600' : 'text-ink')}>{unverifiedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['pending', 'paid'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx('rounded-full px-4 py-2 text-sm font-medium', tab === t ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')}
            >
              {t === 'pending' ? 'Pending' : 'Paid'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(['all', 'store', 'rider'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={clsx('rounded-full px-4 py-2 text-sm font-medium', kind === k ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')}
            >
              {k === 'all' ? 'All' : k === 'store' ? 'Stores' : 'Riders'}
            </button>
          ))}
        </div>
        <select
          value={selectedWeek}
          onChange={(e) => setWeek(e.target.value)}
          aria-label="Week"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink"
        >
          <option value="all">All weeks</option>
          {weeks.map(([start, end]) => (
            <option key={start} value={start}>
              {weekLabel(start, end)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Payee</th>
              <th className="p-4 font-medium">Destination</th>
              <th className="p-4 font-medium">Account</th>
              <th className="p-4 font-medium">Week</th>
              <th className="p-4 text-right font-medium">Amount</th>
              <th className="p-4 font-medium">{tab === 'paid' ? 'Payment' : ''}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={`${r.kind}:${r.id}`} className="border-b border-border align-top last:border-0">
                <td className="p-4">
                  <p className="font-medium text-ink">{r.payeeName}</p>
                  <p className="text-xs text-muted">
                    {r.kind === 'store' ? 'Store' : 'Rider'}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </p>
                  {r.status !== 'pending' && r.status !== 'paid' && (
                    <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">{r.status}</span>
                  )}
                </td>
                <td className="p-4">
                  {r.method === 'upi' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted">UPI</span>
                      <CopyButton value={r.upiId} label="UPI ID" />
                    </div>
                  )}
                  {r.method === 'bank' && (
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="text-muted">
                        Bank{r.bankName ? ` · ${r.bankName}` : ''}
                        {r.accountHolderName ? ` · ${r.accountHolderName}` : ''}
                      </span>
                      <span>
                        A/c <CopyButton value={r.accountNumber} label="account number" />
                      </span>
                      <span>
                        IFSC <CopyButton value={r.ifsc} label="IFSC" />
                      </span>
                      {r.hasProof && (
                        <button type="button" onClick={() => viewProof(r)} className="mt-1 inline-flex items-center gap-1 self-start font-medium text-ink-soft hover:text-ink">
                          <FileImage size={12} /> View proof
                        </button>
                      )}
                    </div>
                  )}
                  {!r.method && <span className="text-xs text-danger">No payout details</span>}
                </td>
                <td className="p-4">
                  <span
                    className={clsx(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      r.verification === 'verified' ? 'bg-green-50 text-success' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {r.verification === 'verified' ? 'Verified' : 'Unverified'}
                  </span>
                  {r.verifiedName && <p className="mt-1 text-xs text-muted">Seen as {r.verifiedName}</p>}
                </td>
                <td className="p-4 text-ink-soft">{weekLabel(r.weekStart, r.weekEnd)}</td>
                <td className="p-4 text-right">
                  <p className="font-semibold tabular-nums text-ink">{formatRupees(r.netAmount)}</p>
                  <CopyButton value={r.netAmount.toFixed(2)} label="amount" />
                </td>
                <td className="p-4">
                  {r.status === 'paid' ? (
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-mono text-ink">{r.utr ?? '—'}</span>
                      <span className="text-muted">
                        {r.paymentMode === 'bank_transfer' ? 'Bank transfer' : r.paymentMode === 'upi' ? 'UPI' : ''}
                        {r.paidAt ? ` · ${formatDateTime(r.paidAt)}` : ''}
                      </span>
                      {r.paidBy && <span className="text-muted">by {r.paidBy}</span>}
                      {r.note && <span className="text-ink-soft">{r.note}</span>}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPaying(r)}
                      disabled={!r.method}
                      className="rounded-full bg-[#155DFC] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted">
                  {tab === 'pending' ? 'Nothing pending for this selection.' : 'No paid payouts for this selection.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paying && (
        <MarkPaidModal
          row={paying}
          onClose={() => setPaying(null)}
          onPaid={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </div>
  );
}
