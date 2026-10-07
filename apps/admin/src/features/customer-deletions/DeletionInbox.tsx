'use client';
import { useEffect, useState } from 'react';
interface RequestRow { id: string; status: string; reason: string; created_at: string; users: { name: string | null; phone: string } | null }
export function DeletionInbox() {
  const [items, setItems] = useState<RequestRow[]>([]); const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [notes, setNotes] = useState<Record<string, string>>({});
  async function load(after?: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/customer-deletions${after ? `?before=${encodeURIComponent(after)}` : ''}`);
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setItems(current => after ? [...current, ...data.items] : data.items); setNext(data.nextCursor);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load requests.'); }
    finally { setBusy(false); }
  }
  // Deferred one microtask so the initial load's setState isn't synchronous
  // inside the effect (same pattern as the other admin pages).
  useEffect(() => { void Promise.resolve().then(() => load()); }, []);
  async function review(row: RequestRow, approve: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/customer-deletions/${row.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve, note: notes[row.id] ?? '' }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Review failed.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Account deletion requests</h1>
    <p className="text-sm text-gray-500">Approval disables login and removes reusable profile data. Historical order and payment records remain. Resolve open orders, refunds and support first.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button disabled={busy} onClick={() => void load()} className="rounded-xl border px-4 py-2">Refresh</button>
    {items.map(row => <article key={row.id} className="space-y-3 rounded-2xl border bg-white p-5">
      <div className="flex justify-between gap-4"><strong>{row.users?.name || 'Customer'}</strong><span className="text-sm capitalize">{row.status}</span></div>
      <p className="text-sm text-gray-500">{row.users?.phone} · {new Date(row.created_at).toLocaleString()}</p>
      <p className="text-sm">{row.reason || 'No reason supplied.'}</p>
      {['pending', 'approved'].includes(row.status) && <>
        <textarea aria-label="Review note" maxLength={1000} value={notes[row.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [row.id]: e.target.value }))} placeholder="Review and retention note" className="w-full rounded-xl border p-3" />
        <div className="flex gap-3"><button disabled={busy || !notes[row.id]?.trim()} onClick={() => void review(row, true)} className="rounded-xl bg-black px-4 py-2 text-white">{row.status === 'approved' ? 'Retry completion' : 'Approve deletion'}</button><button disabled={busy || !notes[row.id]?.trim()} onClick={() => void review(row, false)} className="rounded-xl border px-4 py-2">Reject</button></div>
      </>}
    </article>)}
    {!busy && !items.length && <p className="text-gray-500">No deletion requests.</p>}
    {next && <button disabled={busy} onClick={() => void load(next)} className="rounded-xl border px-4 py-2">Load more</button>}
  </section>;
}
