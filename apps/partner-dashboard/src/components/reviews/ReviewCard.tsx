'use client';

import { useState } from 'react';
import { Star, CornerDownRight, Pencil } from 'lucide-react';
import type { PartnerReview } from '@/lib/partnerApi';
import { avatarColorFor, initialsFor } from '@/lib/avatar';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
        />
      ))}
    </span>
  );
}

// onReply is omitted in demo mode (DEMO_REVIEWS have no real row to write to),
// which also hides the reply affordance — you can only reply to real reviews.
export function ReviewCard({ review, onReply }: { review: PartnerReview; onReply?: (id: string, reply: string) => Promise<void> }) {
  const name = review.users?.name ?? 'Customer';
  const date = new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.owner_reply ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!onReply) return;
    setSaving(true);
    setError(null);
    try {
      await onReply(review.id, draft.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save reply.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-3 px-4 py-5 sm:gap-4 sm:px-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(name)}`}>
        {initialsFor(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
            {review.orders?.order_number && (
              <span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {review.orders.order_number}
              </span>
            )}
          </div>
          <span className="shrink-0 pt-0.5 text-xs whitespace-nowrap text-slate-400">{date}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Stars rating={review.rating} />
          {!review.owner_reply && onReply && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Awaiting reply</span>
          )}
        </div>
        {review.comment ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.comment}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400 italic">Rated without a comment.</p>
        )}

        {/* Existing reply (read view) */}
        {review.owner_reply && !editing && (
          <div className="mt-3 flex gap-2.5 rounded-2xl bg-accent-soft/70 p-3.5">
            <CornerDownRight size={15} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-accent">Your reply</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{review.owner_reply}</p>
            </div>
            {onReply && (
              <button
                type="button"
                onClick={() => { setDraft(review.owner_reply ?? ''); setEditing(true); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-slate-400 transition-colors hover:bg-white hover:text-accent"
                aria-label="Edit reply"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}

        {/* Reply editor */}
        {onReply && editing && (
          <div className="mt-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Write a public reply…"
              autoFocus
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            {error && <p className="mt-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : review.owner_reply ? 'Update reply' : 'Post reply'}
              </button>
            </div>
          </div>
        )}

        {/* Reply CTA (no reply yet) */}
        {onReply && !review.owner_reply && !editing && (
          <button
            type="button"
            onClick={() => { setDraft(''); setEditing(true); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
          >
            <CornerDownRight size={14} /> Reply
          </button>
        )}
      </div>
    </div>
  );
}
