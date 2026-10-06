import { useFestivalCollection } from '../collections/useFestivalCollection';
import { PUJA_PRODUCT_LIMIT } from './data';

export function usePujaEssentials() {
  return useFestivalCollection('puja-essentials', PUJA_PRODUCT_LIMIT);
}
