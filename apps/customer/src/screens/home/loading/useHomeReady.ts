import { useEffect } from 'react';
import { Image } from 'expo-image';
import { useHomePicks } from '../sections/useHomePicks';

// Coverage remains authoritative. Feeds render independently with skeletons;
// image warming is best-effort and never blocks first paint or navigation.
export function useHomeReady(storeReady: boolean): boolean {
  const picks = useHomePicks();
  const photosKey = (picks.data?.['everyday-dairy'] ?? []).slice(0, 6)
    .map(product => product.imageUrl).filter(Boolean).join('|');
  useEffect(() => {
    if (!storeReady || !photosKey) return;
    void Image.prefetch(photosKey.split('|'), 'memory-disk').catch(() => false);
  }, [storeReady, photosKey]);
  return storeReady;
}
