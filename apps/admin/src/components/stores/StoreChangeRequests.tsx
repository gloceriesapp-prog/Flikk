'use client';

// Partner store profile edits waiting for review (migration 114) — name,
// category, address, map pin, drug licence. The live store keeps its old
// values until approved here. Rendered on the Stores page (every pending
// request) and on one store's page (that store's requests, with outcomes).
// Approve/reject: PATCH /api/store-changes/[id]; reject asks for a reason the
// partner sees.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Trash2 } from '@/components/icons';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { ReasonModal } from '@/components/ui/ReasonModal';
import { STORE_CHANGE_LABELS, formatChangeValue } from '@/lib/storeChanges';
import type { StoreChangeRequest } from '@/lib/types';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function mapLink(lat: unknown, lng: unknown) {
  return typeof lat === 'number' && typeof lng === 'number' ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

export function StoreChangeRequests({ storeId, onReviewed, onCountChange, showEmpty = false }: { storeId?: string; onReviewed?: () => void; onCountChange?: (count: number) => void; showEmpty?: boolean }) {
  const [requests, setRequests] = useState<StoreChangeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<StoreChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const readRef = useRef<AbortController | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRef = useRef(false);
  const router = useRouter();

  const load = useCallback(async () => {
    readRef.current?.abort();
    const controller = new AbortController();
    readRef.current = controller;
    try {
      const res = await fetch(storeId ? `/api/store-changes?storeId=${storeId}` : '/api/store-changes', { cache: 'no-store', signal: controller.signal });
      const body = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error(body.error ?? 'Could not load store changes.');
      setRequests(body as StoreChangeRequest[]);
      onCountChange?.((body as StoreChangeRequest[]).filter(request => request.status === 'pending').length);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not load store changes.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [storeId, onCountChange]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    const poll = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(poll);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
      document.removeEventListener('visibilitychange', onVisible);
      readRef.current?.abort();
    };
  }, [load]);
  const refreshFromEvent = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void load();
    }, 250);
  }, [load]);
  useAdminRealtime(refreshFromEvent);

  async function review(id: string, approve: boolean, reason?: string) {
    const res = await fetch(`/api/store-changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, reason }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not review the change.');
    await load();
    onReviewed?.();
    router.refresh();
  }

  async function approve(id: string) {
    if (actionRef.current) return;
    actionRef.current = true;
    setBusy(id);
    setError(null);
    try {
      await review(id, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review the change.');
    } finally {
      actionRef.current = false;
      setBusy(null);
    }
  }

  if (!showEmpty && requests.length === 0 && !error) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
      <h2 className="text-base font-bold text-ink">{storeId ? 'Profile change requests' : 'Store profile changes awaiting review'}</h2>
      <p className="mt-0.5 text-xs text-muted">
        Review partner profile, location and document updates. Current store details stay live until accepted. Times are IST.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error} <button type="button" onClick={() => void load()} className="underline">Retry</button></p>}
      {showEmpty && requests.length === 0 && !error && <p className="mt-4 text-sm text-muted">{loading ? 'Checking partner updates…' : 'No store updates awaiting review.'}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {requests.map((request) => {
          const newPin = mapLink(request.changes.lat, request.changes.lng);
          const oldPin = mapLink(request.previous.lat, request.previous.lng);
          return (
            <div key={request.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {storeId ? (
                    <p className="text-sm font-semibold text-ink">Requested {formatDate(request.createdAt)}</p>
                  ) : (
                    <Link href={`/stores/${request.storeId}`} className="text-sm font-semibold text-ink hover:underline">
                      {request.storeName}
                    </Link>
                  )}
                  {!storeId && <p className="text-xs text-muted">Requested {formatDate(request.createdAt)}</p>}
                </div>
                {request.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/stores/${request.storeId}#store-detail-form`} className="flex items-center gap-1 rounded-[10px] border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                      <Pencil size={13} /> Edit store
                    </Link>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setRejecting(request)}
                      className="flex items-center gap-1 rounded-full border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 size={13} /> Delete request
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void approve(request.id)}
                      className="flex items-center gap-1 rounded-[10px] bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-brand-strong"
                    >
                      <Check size={13} /> {busy === request.id ? 'Accepting…' : 'Accept'}
                    </button>
                  </div>
                ) : (
                  <span className={request.status === 'approved' ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success' : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger'}>
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                    {request.reviewedAt ? ` · ${formatDate(request.reviewedAt)}` : ''}
                  </span>
                )}
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {Object.entries(request.changes).map(([field, value]) => (
                    <tr key={field} className="border-t border-border">
                      <td className="py-1.5 pr-3 text-xs font-medium text-muted">{STORE_CHANGE_LABELS[field] ?? field}</td>
                      <td className="py-1.5 pr-3 text-ink-soft line-through decoration-muted/60">{formatChangeValue(request.previous[field])}</td>
                      <td className="py-1.5 font-semibold text-ink">{formatChangeValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {newPin && (
                <p className="mt-2 text-xs text-muted">
                  Map pin moves — changes which customers the store reaches.{' '}
                  {oldPin && (
                    <a href={oldPin} target="_blank" rel="noreferrer" className="underline">
                      Current pin
                    </a>
                  )}
                  {oldPin && ' · '}
                  <a href={newPin} target="_blank" rel="noreferrer" className="font-semibold underline">
                    Requested pin
                  </a>
                </p>
              )}
              {request.status === 'rejected' && request.reviewReason && <p className="mt-2 text-xs text-danger">Reason: {request.reviewReason}</p>}
            </div>
          );
        })}
      </div>
      {rejecting && (
        <ReasonModal
          title="Delete pending request"
          description={`Remove this request from the approval queue. ${rejecting.storeName} keeps its current details. The request is recorded as rejected, with your reason visible to the partner.`}
          confirmLabel="Delete request"
          onClose={() => setRejecting(null)}
          onConfirm={async (reason) => {
            if (actionRef.current) throw new Error('Another review is being saved. Please retry.');
            actionRef.current = true;
            setBusy(rejecting.id);
            try {
              await review(rejecting.id, false, reason);
              setRejecting(null);
            } finally {
              actionRef.current = false;
              setBusy(null);
            }
          }}
        />
      )}
    </section>
  );
}
