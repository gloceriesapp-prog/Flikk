'use client';

// Bell for the header: the plain Iconly bell when nothing is waiting, the
// animated Lottie bell while there are unread notifications. The animation
// is fetched once per page load and shared; if it cannot load (offline,
// blocked host) the static bell is shown instead.

import { useEffect, useRef, useState } from 'react';
import { IconlyBell } from './iconly';

const BELL_ANIMATION_URL = 'https://images.gloceries.com/icons/icon-bell-1792304862.json';

let animationData: Promise<unknown> | null = null;

function loadAnimation(): Promise<unknown> {
  animationData ??= fetch(BELL_ANIMATION_URL).then((res) => {
    if (!res.ok) throw new Error(`bell animation ${res.status}`);
    return res.json();
  });
  // A failed load is retried on the next mount rather than cached.
  animationData.catch(() => {
    animationData = null;
  });
  return animationData;
}

export function NotificationBell({ active, size = 22, className }: { active: boolean; size?: number; className?: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || failed) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    Promise.all([import('lottie-web/build/player/lottie_light'), loadAnimation()])
      .then(([lottie, data]) => {
        if (cancelled || !container.current) return;
        const anim = lottie.default.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        });
        destroy = () => anim.destroy();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [active, failed]);

  if (!active || failed) return <IconlyBell size={size} className={className} />;
  return <span ref={container} aria-hidden="true" className={className} style={{ display: 'block', width: size, height: size }} />;
}
