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
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'}
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
    <div className="flex gap-3 border-b border-hairline py-4 last:border-b-0">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(name)}`}>
        {initialsFor(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-medium text-neutral-900">{name}</p>
            {review.orders?.order_number && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {review.orders.order_number}
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-400">{date}</span>
        </div>
        <div className="mt-1">
          <Stars rating={review.rating} />
        </div>
        {review.comment && <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{review.comment}</p>}

        {/* Existing reply (read view) */}
        {review.owner_reply && !editing && (
          <div className="mt-3 flex gap-2 rounded-xl bg-neutral-50 p-3">
            <CornerDownRight size={15} className="mt-0.5 shrink-0 text-neutral-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-700">Your reply</p>
              <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{review.owner_reply}</p>
            </div>
            {onReply && (
              <button
                type="button"
                onClick={() => { setDraft(review.owner_reply ?? ''); setEditing(true); }}
                className="shrink-0 self-start rounded-lg p-1 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-600"
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
              className="w-full rounded-xl border border-hairline-strong p-3 text-sm text-neutral-800 outline-none focus:border-neutral-400"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : review.owner_reply ? 'Update reply' : 'Post reply'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reply CTA (no reply yet) */}
        {onReply && !review.owner_reply && !editing && (
          <button
            type="button"
            onClick={() => { setDraft(''); setEditing(true); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            <CornerDownRight size={13} /> Reply
          </button>
        )}
      </div>
    </div>
  );
}
