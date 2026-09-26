'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { fetchMyReviews, replyToReview, type PartnerReview } from '@/lib/partnerApi';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { Card } from '@/components/ui/Card';

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
        <Star key={n} size={18} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyReviews()
      .then(setReviews)
      .finally(() => setIsLoading(false));
  }, []);

  const isDemo = !isLoading && reviews.length === 0;
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

  return (
    <div className="flex flex-col gap-6">
      {isLoading ? (
        <Card className="py-20 text-center text-sm text-neutral-400">Loading reviews…</Card>
      ) : (
        <>
          <Card className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[auto_1fr] sm:gap-10">
            <div className="flex flex-col items-center justify-center sm:pr-10 sm:border-r sm:border-hairline">
              <p className="text-5xl font-semibold tracking-tight text-black tabular-nums">{avg.toFixed(1)}</p>
              <div className="mt-2">
                <StarRow rating={avg} />
              </div>
              <p className="mt-2 text-sm text-neutral-400">{source.length} {source.length === 1 ? 'review' : 'reviews'}</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = dist[star - 1];
                const pct = source.length ? (count / source.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-3 text-neutral-500 tabular-nums">{star}</span>
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-neutral-400 tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="px-6">
            {source.map((r) => (
              <ReviewCard key={r.id} review={r} onReply={isDemo ? undefined : handleReply} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
