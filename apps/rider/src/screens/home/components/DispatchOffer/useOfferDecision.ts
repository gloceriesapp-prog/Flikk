// Accept-race + decline/expire logic shared by the two offer surfaces (dark
// inline card, white bottom sheet) so the money path lives in one place.
//
// Accept hits the real atomic accept-race endpoint; losing the race is a
// normal outcome ('taken'), not an error. Decline / timer expiry just dismiss
// THIS surface locally — the order may still be open and resurface on the next
// dispatch poll.

import { useState } from 'react';
import type { AcceptDispatchOfferResult } from '../../../../api/dispatch';

export type OfferState = 'idle' | 'accepting' | 'taken' | 'declined';

export function useOfferDecision(
  orderId: string,
  onAccept: (orderId: string) => Promise<AcceptDispatchOfferResult>,
  onClose?: () => void,
) {
  const [state, setState] = useState<OfferState>('idle');

  async function handleAccept() {
    setState('accepting');
    const result = await onAccept(orderId);
    // On success the offer leaves nearbyOffers on the next render — no local
    // "accepted" state needed. Only a lost race needs its own message.
    if (result.ok) onClose?.();
    else setState('taken');
  }

  function handleDecline() {
    setState('declined');
    onClose?.();
  }

  return { state, handleAccept, handleDecline };
}
