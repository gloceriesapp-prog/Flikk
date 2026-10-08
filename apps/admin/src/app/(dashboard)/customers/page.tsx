'use client';

// Customer accounts — search by name or phone, see real order count/spend
// per customer. Previously there was no admin visibility into customer
// accounts at all — a support/dispute conversation had no tool beyond
// querying the DB by hand.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
  block: { reason: string; blockedUntil: string | null } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (q: string) => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load customers.');
      setCustomers(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadCustomers(''));
  }, [loadCustomers]);

  // Debounced search — a fresh request per keystroke would hammer the API
  // for no benefit; 350ms matches this app's own search-input convention
  // elsewhere (LocationPinScreen's own note, same idea).
  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(query), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  useAdminRealtime(() => loadCustomers(query));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Customers</h1>
        <p className="text-sm text-muted">{loading ? 'Loading…' : `${customers.length} accounts.`}</p>
      </div>

      <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2.5">
        <Search size={14} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          className="w-64 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium text-right">Orders</th>
              <th className="p-4 font-medium text-right">Total spend</th>
              <th className="p-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                <td className="p-0">
                  <Link href={`/customers/${customer.id}`} className="block p-4 font-medium text-ink">
                    {customer.name ?? 'No name on file'}
                    {customer.block && (
                      <span title={customer.block.reason} className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        Blocked
                      </span>
                    )}
                  </Link>
                </td>
                <td className="p-4 text-ink-soft">{customer.phone}</td>
                <td className="p-4 text-right tabular-nums text-ink-soft">{customer.orderCount}</td>
                <td className="p-4 text-right font-semibold tabular-nums text-ink">{formatCurrency(customer.totalSpend)}</td>
                <td className="p-4 text-ink-soft">
                  {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}

            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  {query ? `No customers match "${query}".` : 'No customer accounts yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
