'use client';
import { useCallback, useEffect, useState } from 'react';
interface ChangeRequest {
  id: string; submitted_at: string;
  users: { name: string | null; phone: string } | { name: string | null; phone: string }[];
  changes: Record<string, string | null>;
}
export function RiderChangeRequests() {
  const [rows, setRows] = useState<ChangeRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/riders/profile-changes', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load rider change requests.');
      setRows(await res.json()); setLoaded(true); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load requests.'); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function review(id: string, approve: boolean) {
    if (busy) return;
    setBusy(id); setError(null);
    try {
      const res = await fetch('/api/riders/profile-changes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approve, note: notes[id] ?? '' }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not review changes.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not review changes.'); }
    finally { setBusy(null); }
  }
  return <section className="rounded-3xl border border-border bg-card p-5">
    <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Document and vehicle changes</h2>
      <button onClick={() => void load()} className="text-sm underline">Refresh</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {!loaded && !error && <p className="mt-3 text-sm text-muted">Checking rider updates…</p>}
    {loaded && !error && !rows.length && <p className="mt-3 text-sm text-muted">No changes awaiting review.</p>}
    {rows.map((row) => { const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return <article key={row.id} className="mt-4 rounded-2xl border border-border p-4">
        <h3 className="font-semibold">{user?.name ?? 'Rider'} · {user?.phone}</h3>
        <p className="text-xs text-muted">Submitted {new Date(row.submitted_at).toLocaleString()}</p>
        <div className="my-3 grid gap-3 sm:grid-cols-2">{Object.entries(row.changes).map(([key, value]) =>
          key.endsWith('_photo_url') ? value && <div key={key}><p className="text-sm">{key === 'dl_photo_url' ? 'New licence scan' : 'New Aadhaar scan'}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private signed URL */}
            <img src={value} alt="Submitted document" className="h-40 w-full rounded-xl object-contain" /></div> :
          <p key={key} className="text-sm">{key.replaceAll('_', ' ')}: {value ?? 'None'}</p>)}</div>
        <input value={notes[row.id] ?? ''} maxLength={500} onChange={(e) => setNotes((old) => ({ ...old, [row.id]: e.target.value }))}
          placeholder="Review note (required for rejection)" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
        <div className="mt-3 flex gap-4"><button disabled={!!busy} onClick={() => void review(row.id, true)} className="font-semibold text-success">Approve changes</button>
          <button disabled={!!busy} onClick={() => void review(row.id, false)} className="font-semibold text-danger">Reject changes</button></div>
      </article>;
    })}
  </section>;
}
