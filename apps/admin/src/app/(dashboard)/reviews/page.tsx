'use client';

// Reviews — real customer feedback (public.reviews via app/api/reviews),
// previously only ever surfaced as the one aggregate number on the
// Performing Store table. This is where a founder actually reads what a
// review says — per store, sorted newest first — to catch a real problem
// or spot an abusive/spam entry, not just watch stores.rating move.
//
// Delete is real moderation: app/api/reviews/[id]/route.ts removes the row
// AND recomputes that store's rating from what's left, same average logic
// backend's own POST /reviews uses — never leaves stores.rating stale.

import { useCallback, useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  storeId: string;
  storeName: string;
  customerName: string;
}

const RATING_FILTERS = ['All', '1-2 stars', '3 stars', '4-5 stars'] as const;

function matchesFilter(rating: number, filter: (typeof RATING_FILTERS)[number]): boolean {
  if (filter === 'All') return true;
  if (filter === '1-2 stars') return rating <= 2;
  if (filter === '3 stars') return rating === 3;
  return rating >= 4;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof RATING_FILTERS)[number]>('All');
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const loadReviews = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load reviews.');
      setReviews(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadReviews);
  }, [loadReviews]);
  useAdminRealtime(loadReviews);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setRowError({ id, message: body?.error ?? 'Could not delete.' });
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = reviews.filter((r) => matchesFilter(r.rating, filter));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Reviews</h1>
        <p className="text-sm text-muted">{loading ? 'Loading…' : `${reviews.length} reviews, most recent 200.`}</p>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {RATING_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              filter === f ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((review) => (
          <div key={review.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">{review.storeName}</p>
                <p className="text-xs text-muted">
                  {review.customerName} · {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  className="text-muted hover:text-danger"
                  aria-label="Delete review"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {review.comment && <p className="mt-3 text-sm text-ink-soft">{review.comment}</p>}
            {review.ownerReply && <div className="mt-3 rounded-xl bg-neutral-50 p-3"><p className="text-xs font-semibold text-muted">Store reply{review.ownerRepliedAt ? ` · ${new Date(review.ownerRepliedAt).toLocaleDateString('en-IN')}` : ''}</p><p className="mt-1 text-sm text-ink-soft">{review.ownerReply}</p></div>}
            {rowError?.id === review.id && <p className="mt-2 text-xs text-danger">{rowError.message}</p>}
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <p className="rounded-3xl border border-border bg-card py-8 text-center text-sm text-muted">
            {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match this filter.'}
          </p>
        )}
      </div>
    </div>
  );
}
