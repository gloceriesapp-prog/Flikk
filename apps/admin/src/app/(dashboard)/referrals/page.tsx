'use client';

// Referrals: who invited whom with their invite code, and whether the invited
// customer has had an order delivered. There are no referral rewards in the
// system (tracking only, migration 022), so there is nothing to pay out here.

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Person {
  id: string;
  name: string | null;
  phone: string;
}

interface ReferralData {
  codesIssued: number;
  signups: { id: string; createdAt: string; code: string; referrer: Person | null; referred: Person | null; hasDeliveredOrder: boolean }[];
  topReferrers: { referrer: Person; invites: number; ordered: number }[];
}

function PersonLink({ person }: { person: Person | null }) {
  if (!person) return <span className="text-muted">Unknown</span>;
  return <Link href={`/customers/${person.id}`} className="font-medium text-ink hover:underline">{person.name ?? person.phone}</Link>;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/referrals')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Could not load referrals.');
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load referrals.'));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Referrals</h1>
        <p className="text-sm text-muted">Invite codes customers shared and who joined with them. Referrals are tracked only: no rewards or credits are given.</p>
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Invite codes issued', value: data.codesIssued },
              { label: 'Customers who joined with a code', value: data.signups.length },
              { label: 'Of those, with a delivered order', value: data.signups.filter((s) => s.hasDeliveredOrder).length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-border bg-card p-5">
                <p className="text-xs text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Top referrers</h2>
            {data.topReferrers.length === 0 ? (
              <p className="text-sm text-muted">No referrals yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.topReferrers.map((r) => (
                  <li key={r.referrer.id} className="flex items-center justify-between text-sm">
                    <PersonLink person={r.referrer} />
                    <span className="text-xs text-muted">{r.invites} joined · {r.ordered} ordered</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted">
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">New customer</th>
                  <th className="px-4 py-3">Invited by</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Delivered order</th>
                </tr>
              </thead>
              <tbody>
                {data.signups.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-muted">No one has joined with an invite code yet.</td></tr>
                )}
                {data.signups.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3"><PersonLink person={s.referred} /></td>
                    <td className="px-4 py-3"><PersonLink person={s.referrer} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{s.code}</td>
                    <td className="px-4 py-3 text-xs">{s.hasDeliveredOrder ? <span className="font-semibold text-success">Yes</span> : <span className="text-muted">Not yet</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
