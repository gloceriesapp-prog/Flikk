import { useRef, useState } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReviewForOrder, submitReview } from '../../api/reviews';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrderRatingPreview } from './preview';

// Both rating surfaces share an account-scoped review. Hide only after the
// server accepts the rating; failures preserve the prompt for an explicit retry.
export function useOrderRating(orderId: string | undefined, enabled: boolean, previewOnly = false) {
  const customerId = useAuthStore(s => s.customerId);
  const sessionEpoch = useAuthStore(s => s.sessionEpoch);
  const sampleRating = useOrderRatingPreview(s => s.rating);
  const client = useQueryClient();
  const [selection, setSelection] = useState<{ orderId: string | undefined; score: number } | null>(null);
  const sending = useRef(false);
  const key = ['review', orderId, customerId];
  const review = useQuery({
    queryKey: key,
    queryFn: () => fetchReviewForOrder(orderId!),
    enabled: enabled && !!orderId && !!customerId && !previewOnly,
  });
  const savingCount = useIsMutating({ mutationKey: key });
  const save = useMutation({
    mutationKey: key,
    mutationFn: (score: number) => submitReview(orderId!, score),
    retry: false,
    onSuccess: result => {
      if (useAuthStore.getState().sessionEpoch === sessionEpoch) client.setQueryData(key, result);
    },
    onError: error => {
      if ((error as { code?: string }).code === 'ALREADY_REVIEWED' && useAuthStore.getState().sessionEpoch === sessionEpoch) {
        void client.invalidateQueries({ queryKey: key, exact: true });
      }
    },
  });
  const visible = enabled && (previewOnly ? sampleRating === 0 : !!customerId && review.isSuccess && !review.data);

  async function rate(score: number) {
    // Read the shared mutation cache at tap time. The reactive count can lag
    // behind another surface's tap, briefly allowing two submissions.
    if (!visible || sending.current || client.isMutating({ mutationKey: key, exact: true }) > 0 || !Number.isInteger(score) || score < 1 || score > 5) return;
    setSelection({ orderId, score });
    if (previewOnly) {
      useOrderRatingPreview.getState().rate(score);
      return;
    }
    sending.current = true;
    try { await save.mutateAsync(score); }
    catch { /* The visible prompt presents the mutation error for retry. */ }
    finally { sending.current = false; }
  }

  return { visible, rating: selection?.orderId === orderId ? selection?.score ?? 0 : 0, rate, isSaving: savingCount > 0,
    error: save.isError && selection?.orderId === orderId ? 'Couldn’t save your rating. Tap a star to retry.' : null };
}
