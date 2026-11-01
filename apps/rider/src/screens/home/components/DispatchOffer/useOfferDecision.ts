// Accept-race + decline/expire logic shared by the two offer surfaces (dark
// inline card, white bottom sheet) so the money path lives in one place.
//
// Accept hits the real atomic accept-race endpoint; losing the race is a
// normal outcome ('taken'), not an error. Decline / timer expiry just dismiss
// THIS surface locally — the order may still be open and resurface on the next
// dispatch poll.

import { useEffect, useState } from 'react';
import type { AcceptDispatchOfferResult } from '../../../../api/dispatch';
import { track } from '../../../../analytics/track';

export type OfferState = 'idle' | 'accepting' | 'taken' | 'declined';

export function useOfferDecision(
  orderId: string,
  onAccept: (orderId: string) => Promise<AcceptDispatchOfferResult>,
  onClose?: () => void,
) {
  const [state, setState] = useState<OfferState>('idle');

  // Both offer surfaces go through here, so viewed → accepted/dismissed is
  // one funnel. Dismissed covers both the decline button and timer expiry.
  useEffect(() => {
    track('offer_viewed', { order_id: orderId });
  }, [orderId]);

  async function handleAccept() {
    setState('accepting');
    const result = await onAccept(orderId);
    track('offer_accepted', { order_id: orderId, won: result.ok });
    // On success the offer leaves nearbyOffers on the next render — no local
    // "accepted" state needed. Only a lost race needs its own message.
    if (result.ok) onClose?.();
    else setState('taken');
  }

  function handleDecline() {
    track('offer_dismissed', { order_id: orderId });
    setState('declined');
    onClose?.();
  }

  return { state, handleAccept, handleDecline };
}
