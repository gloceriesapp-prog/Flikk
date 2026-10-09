'use client';
import { useCallback, useEffect, useState } from 'react';
interface Member { id: string; name: string | null; phone: string; role: 'owner' | 'manager'; pushRegistered: boolean; approved: boolean }
export function StoreTeamPanel({ storeId }: { storeId: string }) {
  return <StoreTeamContent key={storeId} storeId={storeId} />;
}
function StoreTeamContent({ storeId }: { storeId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal): Promise<Member[]> => {
    const response = await fetch(`/api/stores/${storeId}/team`, { cache: 'no-store', signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Could not load store team.');
    return body;
  }, [storeId]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      rows => { if (!controller.signal.aborted) setMembers(rows); },
      err => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Could not load store team.');
        }
      },
    );
    return () => controller.abort();
  }, [load]);
  async function save(active: boolean, userId?: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/team`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active, phone, userId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not update team.');
      setPhone(''); setMembers(await load());
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update team.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-3xl border border-border bg-white p-5">
    <h2 className="font-semibold text-ink">Store team & push registration</h2>
    <p className="mt-1 text-sm text-muted">Managers can manage orders, products and reviews. Only the owner can edit legal details or the payout account. A registered push token does not guarantee delivery.</p>
    <div className="mt-4 divide-y divide-border">{members.map(member => <div key={member.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{member.name || member.phone} · {member.role}</p><p className="text-xs text-muted">{member.phone} · Push {member.pushRegistered ? 'registered' : 'not registered'}{!member.approved ? ' · account not approved' : ''}</p></div>{member.role !== 'owner' && <button type="button" disabled={busy} onClick={() => save(false, member.id)} className="text-sm text-danger disabled:opacity-50">Remove</button>}</div>)}</div>
    <form onSubmit={event => { event.preventDefault(); void save(true); }} className="mt-4 flex gap-3"><input aria-label="Manager phone number" placeholder="Manager's mobile number" type="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={20} className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm" /><button disabled={busy || !phone.trim()} className="rounded-xl bg-ink px-4 py-2 text-sm text-white disabled:opacity-50">Add manager</button></form>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </section>;
}
