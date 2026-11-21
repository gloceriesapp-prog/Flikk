'use client';

// Cut-out state of a saved product's photos (main and extra), refreshed
// every 4s while any is still cleaning. onCleaned fires when a photo's
// cleaned version is ready, so an open form swaps it in and a later save
// cannot put the uncleaned photo back.

import { useEffect, useState } from 'react';
import type { PhotoState, PhotoStatus } from '@/app/api/product-images/photos/route';

export function usePhotoStatus(productId: string | undefined, urls: string[], onCleaned: (from: string, to: string) => void) {
  const [states, setStates] = useState<Map<string, PhotoState>>(new Map());
  const key = urls.join('|');

  useEffect(() => {
    if (!productId || !key) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      const res = await fetch('/api/product-images/photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, urls: key.split('|') }),
      }).catch(() => null);
      if (stopped || !res?.ok) return;
      const list = (await res.json()) as PhotoStatus[];
      setStates(new Map(list.map((p) => [p.url, p.state])));
      list.forEach((p) => { if (p.cleanedUrl) onCleaned(p.url, p.cleanedUrl); });
      if (list.some((p) => p.state === 'cleaning')) timer = setTimeout(check, 4000);
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); };
    // onCleaned is a fresh closure each render; the photo list drives refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, key]);

  return states;
}

const BADGE: Record<Exclude<PhotoState, 'none'>, { text: string; className: string }> = {
  cleaning: { text: 'Cleaning…', className: 'bg-ink/75 text-white' },
  cleaned: { text: '✓ Cleaned', className: 'bg-[#16A34A]/90 text-white' },
  review: { text: 'Needs review', className: 'bg-amber-500/90 text-white' },
};

export function PhotoStatusBadge({ state }: { state: PhotoState | undefined }) {
  if (!state || state === 'none') return null;
  const badge = BADGE[state];
  return (
    <span className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 py-0.5 text-center text-[9px] font-semibold ${badge.className}`}>
      {badge.text}
    </span>
  );
}
