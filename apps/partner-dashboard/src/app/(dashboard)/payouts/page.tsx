'use client';

import { useEffect, useState } from 'react';
import { fetchMyPayouts, type Payout } from '@/lib/partnerApi';
import { formatInr, formatDate, statusColor, statusLabel } from '@/lib/format';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyPayouts()
      .then((res) => setPayouts([...res].sort((a, b) => +new Date(b.week_start) - +new Date(a.week_start))))
      .finally(() => setIsLoading(false));
  }, []);

  const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.net_payout, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Payouts</h1>
        <p className="mt-1 text-sm text-neutral-500">Lifetime paid: {formatInr(totalPaid)}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-neutral-400">No payouts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-neutral-500">
                <th className="px-5 py-3 font-medium">Week</th>
                <th className="px-5 py-3 font-medium">Gross</th>
                <th className="px-5 py-3 font-medium">Commission</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-5 py-3.5 text-neutral-700">
                    {formatDate(p.week_start)} – {formatDate(p.week_end)}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-700">{formatInr(p.gross_amount)}</td>
                  <td className="px-5 py-3.5 text-neutral-500">-{formatInr(p.commission_deducted)}</td>
                  <td className="px-5 py-3.5 font-medium text-neutral-900">{formatInr(p.net_payout)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
