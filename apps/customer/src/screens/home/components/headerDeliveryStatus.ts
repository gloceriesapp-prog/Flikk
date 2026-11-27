import { useCopy } from '../../../api/appConfig';

export type HeaderDeliveryStatus = 'normal' | 'high_demand' | 'rain' | 'rain_and_demand' | 'on_hold' | 'unavailable';

/** One Admin-selected state; older saved switches remain compatible until saved again. */
export function useHeaderDeliveryStatus(): HeaderDeliveryStatus {
  const status = useCopy('home.delivery.status');
  const oldDemand = useCopy('home.highDemand.enabled') === 'true';
  const oldRain = useCopy('home.rain.enabled') === 'true';
  if (status === 'normal' || status === 'high_demand' || status === 'rain' || status === 'rain_and_demand' || status === 'on_hold' || status === 'unavailable') return status;
  return oldRain && oldDemand ? 'rain_and_demand' : oldRain ? 'rain' : oldDemand ? 'high_demand' : 'normal';
}
