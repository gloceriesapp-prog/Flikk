'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
type RequesterRole = 'customer' | 'rider' | 'store_owner';
const ROLE_LABEL: Record<RequesterRole, string> = { customer: 'Customer', rider: 'Rider', store_owner: 'Store partner' };
const roleLabel = (role: string | undefined) => ROLE_LABEL[(role ?? 'customer') as RequesterRole] ?? 'Customer';
interface Ticket {
    id: string;
    requester_role?: RequesterRole;
    category: string;
    status: string;
    initial_message: string;
    order_id: string | null;
    trip_id: string | null;
    updated_at: string;
}
interface Message {
    id: string;
    actor_role: string;
    body: string;
    created_at: string;
}
class SupportRequestError extends Error { constructor(message:string,readonly status:number){super(message);} }
async function call<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok)
        throw new SupportRequestError(data.error ?? 'Request failed',response.status);
    return data;
}
function Conversation({ id }: {
    id: string;
}) {
    const [data, setData] = useState<{
        ticket: Ticket;
        messages: Message[];
    }>();
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [status, setStatus] = useState('in_progress');
    const [busy, setBusy] = useState(false);
    const [uncertain, setUncertain] = useState(false);
    const [older, setOlder] = useState<Message[]>([]);
    const [offset, setOffset] = useState(0);
    const [more, setMore] = useState(true);
    const attempt = useRef<{
        request_id: string;
        message: string;
        status: string;
    } | null>(null);
    const lock = useRef(false);
    const retainedMessages = useRef(new Map<string, Message>());
    const load = useCallback(async () => { try {
        const page = await call<{ticket:Ticket;messages:Message[]}>(`/api/support/${id}`);
        for(const row of page.messages)retainedMessages.current.set(row.id,row);
        setData({...page,messages:[...retainedMessages.current.values()]});
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load conversation');
    } }, [id]);
    useEffect(() => { void Promise.resolve().then(load); const timer = setInterval(() => { if (document.visibilityState === 'visible')
        void load(); }, 15000); return () => clearInterval(timer); }, [load]);
    async function send() { if (lock.current)
        return; lock.current = true; setBusy(true); try {
        attempt.current ??= { request_id: crypto.randomUUID(), message: text.trim(), status };
        await call(`/api/support/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt.current) });
        attempt.current = null;
        setUncertain(false);
        setText('');
        await load();
    }
    catch (e) {
        const unknown=!(e instanceof SupportRequestError)||e.status>=500||e.status===408;
            if(!unknown)attempt.current=null;
            setUncertain(unknown&&!!attempt.current);
        setError(e instanceof Error ? e.message : 'Reply not confirmed');
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    async function earlier() { if (lock.current)
        return; lock.current = true; setBusy(true); try {
        const page = await call<{
            messages: Message[];
        }>(`/api/support/${id}?offset=${offset + 25}`);
        setOlder(rows => [...rows, ...page.messages]);
        setOffset(offset + 25);
        setMore(page.messages.length === 25);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load messages');
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    const messages = [...new Map([...(data?.messages ?? []), ...older].map(m => [m.id, m])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return <section className="space-y-4 rounded-3xl border border-border bg-white p-6">
  {error ? <div role="alert" className="text-sm text-red-600">{error} <button onClick={() => void load()} className="underline">Retry</button></div> : null}
  {!data ? <p className="text-muted">Loading conversation…</p> : <>
   <h2 className="text-xl font-bold">{data.ticket.category.replace(/_/g, ' ')} · {data.ticket.status.replace(/_/g, ' ')}</h2>
   <p className="text-xs text-muted">{roleLabel(data.ticket.requester_role)} case {id}</p>
   {data.ticket.order_id ? <Link href={`/orders/${data.ticket.order_id}`} className="text-sm underline">View order</Link> : data.ticket.trip_id ? <p className="text-sm text-muted">Multi-shop trip: {data.ticket.trip_id}</p> : null}
   {more && (data.messages.length >= 25) ? <button onClick={() => void earlier()} disabled={busy} className="rounded-xl border px-4 py-2">Earlier messages</button> : null}
   <div className="max-h-[440px] space-y-3 overflow-y-auto">{messages.map(m => <div key={m.id} className={`rounded-2xl p-4 ${m.actor_role === 'admin' ? 'bg-blue-50' : 'bg-gray-50'}`}><p className="text-xs text-muted">{m.actor_role === 'admin' ? 'Support' : roleLabel(m.actor_role)} · {new Date(m.created_at).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p></div>)}</div>
   <textarea aria-label="Reply" value={text} onChange={e => setText(e.target.value)} disabled={busy || uncertain} maxLength={2000} rows={4} className="w-full rounded-2xl border p-4" placeholder="Write a helpful reply. Resolving a case does not issue a refund."/>
   <div className="flex gap-3"><select aria-label="Case status after reply" value={status} disabled={busy || uncertain} onChange={e => setStatus(e.target.value)} className="rounded-xl border px-3 py-2"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><button onClick={() => void send()} disabled={busy || !text.trim()} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : uncertain ? 'Retry same reply' : 'Send reply'}</button></div>
  </>}
 </section>;
}
export function SupportInbox() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selected, setSelected] = useState<string>();
    const [error, setError] = useState('');
    const [offset, setOffset] = useState(0);
    const [more, setMore] = useState(true);
    // Requester filter (migration 118): customers, riders and store partners
    // all raise tickets into this one inbox.
    const [role, setRole] = useState<RequesterRole | ''>('');
    const roleQuery = role ? `role=${role}` : '';
    const activeRole = useRef(roleQuery);
    const load = useCallback(async () => { try {
        const data = await call<Ticket[]>(`/api/support${roleQuery ? `?${roleQuery}` : ''}`);
        if (activeRole.current !== roleQuery)
            return; // A response for the previous filter.
        setTickets(current => [...new Map([...current, ...data].map(t => [t.id, t])).values()]);
        setMore(data.length === 25);
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load tickets');
    } }, [roleQuery]);
    useEffect(() => { void Promise.resolve().then(load); const timer = setInterval(() => { if (document.visibilityState === 'visible')
        void load(); }, 15000); return () => clearInterval(timer); }, [load]);
    function changeRole(next: RequesterRole | '') {
        activeRole.current = next ? `role=${next}` : '';
        setRole(next);
        setTickets([]);
        setSelected(undefined);
        setOffset(0);
        setMore(true);
    }
    async function next() { try {
        const data = await call<Ticket[]>(`/api/support?offset=${offset + 25}${roleQuery ? `&${roleQuery}` : ''}`);
        if (activeRole.current !== roleQuery)
            return;
        setTickets(current => [...new Map([...current, ...data].map(t => [t.id, t])).values()]);
        setOffset(offset + 25);
        setMore(data.length === 25);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load tickets');
    } }
    return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Support</h1><p className="mt-2 text-sm text-muted">Conversations from customers, riders and store partners: orders, payments, payouts and app problems.</p></div><label className="flex items-center gap-2 text-sm text-muted">From<select aria-label="Filter by requester" value={role} onChange={e => changeRole(e.target.value as RequesterRole | '')} className="rounded-xl border bg-white px-3 py-2 text-ink"><option value="">Everyone</option><option value="customer">Customers</option><option value="rider">Riders</option><option value="store_owner">Store partners</option></select></label></div>{error ? <p role="alert" className="text-red-600">{error} <button onClick={() => void load()} className="underline">Retry</button></p> : null}<div className="grid gap-6 lg:grid-cols-[340px_1fr]"><aside className="space-y-3">{tickets.map(t => <button key={t.id} onClick={() => setSelected(t.id)} className={`w-full rounded-2xl border p-4 text-left ${selected === t.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}><p className="flex items-center justify-between gap-2 font-semibold"><span>{t.category.replace(/_/g, ' ')}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-muted">{roleLabel(t.requester_role)}</span></p><p className="mt-1 text-xs text-muted">{t.status.replace(/_/g, ' ')} · {new Date(t.updated_at).toLocaleString()}</p><p className="mt-2 line-clamp-2 text-sm">{t.initial_message}</p></button>)}{!tickets.length && !error ? <p className="text-sm text-muted">No conversations yet.</p> : null}{more ? <button onClick={() => void next()} className="rounded-xl border px-4 py-2">More cases</button> : null}</aside>{selected ? <Conversation key={selected} id={selected}/> : <div className="rounded-3xl border bg-white p-8 text-muted">Select a case to read and reply.</div>}</div></div>;
}
