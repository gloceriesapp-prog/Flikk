import { useCopy } from '../../../api/appConfig';

export type HeaderDeliveryStatus = 'normal' | 'on_hold' | 'unavailable';

/** Display-only operational status; checkout availability remains server-owned. */
export function useHeaderDeliveryStatus(): HeaderDeliveryStatus {
  const status = useCopy('home.delivery.status');
  return status === 'on_hold' || status === 'unavailable' ? status : 'normal';
}
