// When Home may replace its loader with the real page. Like the quick-commerce
// apps, the first screen appears complete instead of popping in piece by
// piece: wait for the shop check, the Home layout, the category tiles and the
// first product row, then warm that row's photos. Never longer than
// HOME_LOADER_MAX_MS: past that Home shows anyway with its own skeletons. A
// repeat open with this data already saved on the phone (query persistence)
// is ready on the first render, so the loader never flashes.
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useHomeSections } from '../useHomeSections';
import { useHomeTabs } from '../data/useHomeTabs';
import { useHomePicks } from '../sections/useHomePicks';

export const HOME_LOADER_MAX_MS = 4000;
const PHOTO_WARM_MAX_MS = 1200;
const FIRST_ROW_PHOTOS = 6;

export function useHomeReady(storeReady: boolean): boolean {
  const sections = useHomeSections();
  const tabs = useHomeTabs();
  const picks = useHomePicks();
  const dataReady = storeReady && !sections.isPending && !tabs.isResolvingTabs && !picks.isPending;

  // Ready at once when everything came from the phone's saved copy.
  const [ready, setReady] = useState(dataReady);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), HOME_LOADER_MAX_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const firstPhotos = (picks.data?.['everyday-dairy'] ?? [])
    .slice(0, FIRST_ROW_PHOTOS)
    .map((p) => p.imageUrl)
    .filter((url): url is string => Boolean(url));
  const photosKey = firstPhotos.join('|');

  useEffect(() => {
    if (ready || !dataReady) return;
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    const urls = photosKey ? photosKey.split('|') : [];
    if (urls.length === 0) { finish(); return; }
    const timer = setTimeout(finish, PHOTO_WARM_MAX_MS);
    void Image.prefetch(urls, 'memory-disk').catch(() => false).finally(finish);
    return () => { done = true; clearTimeout(timer); };
  }, [dataReady, photosKey, ready]);

  return ready || timedOut;
}
