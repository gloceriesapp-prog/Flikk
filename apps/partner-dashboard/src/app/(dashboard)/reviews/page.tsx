'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MessageSquareReply, MessagesSquare, Star } from 'lucide-react';
import { fetchMyReviews, replyToReview, type PartnerReview } from '@/lib/partnerApi';
import Link from 'next/link';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { Card } from '@/components/ui/Card';
import { BUTTON, EmptyState, ErrorState, RowsSkeleton, Skeleton, chipClass, chipCountClass } from '@/components/inventory/DataStates';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

// DEMO DATA — same isDemo convention as Overview/Orders: shown only while
// the store has zero real reviews, replaced the instant a real one lands.
const DEMO_REVIEWS: PartnerReview[] = [
  { id: 'd1', rating: 5, comment: 'Fresh vegetables and super fast delivery. Will order again!', created_at: new Date(Date.now() - 2 * 86400e3).toISOString(), owner_reply: 'Thank you Anita! See you next order.', owner_replied_at: new Date(Date.now() - 1 * 86400e3).toISOString(), users: { name: 'Anita Rao' }, orders: { order_number: 'FLK-1042' } },
  { id: 'd2', rating: 4, comment: 'Good quality, packaging could be better.', created_at: new Date(Date.now() - 5 * 86400e3).toISOString(), owner_reply: null, owner_replied_at: null, users: { name: 'Suresh Kamath' }, orders: { order_number: 'FLK-1039' } },
  { id: 'd3', rating: 5, comment: 'Best kirana in the area. Milk always fresh.', created_at: new Date(Date.now() - 9 * 86400e3).toISOString(), owner_reply: null, owner_replied_at: null, users: { name: 'Priya Shetty' }, orders: { order_number: 'FLK-1031' } },
  { id: 'd4', rating: 3, comment: 'One item was missing but they refunded quickly.', created_at: new Date(Date.now() - 14 * 86400e3).toISOString(), owner_reply: null, owner_replied_at: null, users: { name: 'Rahul Nayak' }, orders: { order_number: 'FLK-1024' } },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={18} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
      ))}
    </span>
  );
}

type ReplyFilter = 'all' | 'needs_reply' | 'replied';
const REPLY_FILTERS: { key: ReplyFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs_reply', label: 'Needs reply' },
  { key: 'replied', label: 'Replied' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');

  function load() {
    return fetchMyReviews()
      .then((rows) => {
        setReviews(rows);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  function retry() {
    setIsLoading(true);
    setLoadError(false);
    void load();
  }

  const isDemo = DEMO_DATA_ENABLED && !isLoading && reviews.length === 0;
  const source = isDemo ? DEMO_REVIEWS : reviews;

  // Only real reviews are replyable — demo rows have no DB row to write to,
  // so onReply is left undefined for them (the card then hides its reply UI).
  async function handleReply(id: string, reply: string) {
    const updated = await replyToReview(id, reply);
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  const { avg, dist } = useMemo(() => {
    if (source.length === 0) return { avg: 0, dist: [0, 0, 0, 0, 0] };
    const d = [0, 0, 0, 0, 0]; // index 0 = 1 star … index 4 = 5 stars
    let sum = 0;
    for (const r of source) {
      sum += r.rating;
      if (r.rating >= 1 && r.rating <= 5) d[r.rating - 1]++;
    }
    return { avg: sum / source.length, dist: d };
  }, [source]);

  const replyCounts = useMemo(() => {
    const replied = source.filter((r) => !!r.owner_reply).length;
    return { all: source.length, replied, needs_reply: source.length - replied } as Record<ReplyFilter, number>;
  }, [source]);

  const visible = useMemo(() => {
    if (replyFilter === 'needs_reply') return source.filter((r) => !r.owner_reply);
    if (replyFilter === 'replied') return source.filter((r) => !!r.owner_reply);
    return source;
  }, [source, replyFilter]);

  const replyRate = source.length ? Math.round((replyCounts.replied / source.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-3 sm:w-48">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-2.5 w-full rounded-full" />
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <RowsSkeleton rows={4} />
        </Card>
      </div>
    );
  }

  if (loadError && !isDemo) {
    return (
      <Card>
        <ErrorState title="Couldn’t load your reviews" onRetry={retry} />
      </Card>
    );
  }

  if (source.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={MessagesSquare}
          title="No reviews yet"
          description="Customers can rate your store after an order is delivered."
          action={
            <Link href="/orders" className={BUTTON.secondary}>
              View orders
            </Link>
          }
        />
      </Card>
    );
  }

  let list: ReactNode;
  if (visible.length === 0) {
    list = (
      <EmptyState
        icon={MessageSquareReply}
        title={replyFilter === 'needs_reply' ? 'You’re all caught up' : 'No replies yet'}
        description={replyFilter === 'needs_reply' ? 'Every review has a reply.' : 'Replies you post show up here.'}
        action={
          <button type="button" onClick={() => setReplyFilter('all')} className={BUTTON.secondary}>
            Show all reviews
          </button>
        }
      />
    );
  } else {
    list = (
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {visible.map((r) => (
          <ReviewCard key={r.id} review={r} onReply={isDemo ? undefined : handleReply} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rating summary */}
      <Card className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-[200px_1fr_220px] md:items-center md:gap-8">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="tnum text-[56px] leading-none font-semibold tracking-tight text-ink">{avg.toFixed(1)}</p>
          <div className="mt-3">
            <StarRow rating={avg} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Based on {source.length} {source.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2.5 md:border-x md:border-slate-100 md:px-8">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = dist[star - 1];
            const pct = source.length ? (count / source.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="tnum flex w-8 shrink-0 items-center gap-1 text-slate-600">
                  {star}
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="tnum w-6 shrink-0 text-right text-slate-400">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <div className="rounded-2xl bg-accent-soft p-4">
            <p className="text-xs font-medium text-accent">Reply rate</p>
            <p className="tnum mt-1 text-2xl font-semibold text-ink">{replyRate}%</p>
          </div>
          <div className={`rounded-2xl p-4 ${replyCounts.needs_reply > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <p className={`text-xs font-medium ${replyCounts.needs_reply > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Awaiting reply</p>
            <p className="tnum mt-1 text-2xl font-semibold text-ink">{replyCounts.needs_reply}</p>
          </div>
        </div>
      </Card>

      {/* Review list */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="text-lg font-semibold text-ink">Customer reviews</h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter reviews">
            {REPLY_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={replyFilter === key}
                onClick={() => setReplyFilter(key)}
                className={chipClass(replyFilter === key)}
              >
                {label}
                <span className={chipCountClass(replyFilter === key)}>{replyCounts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        {list}
      </Card>
    </div>
  );
}
