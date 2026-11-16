'use client';

// Live-sync hook for the dashboard: a plain "something may have changed,
// refetch" signal shared by every caller (Sidebar, the active page and the
// dashboard widgets).
//
// It used to be a Server-Sent Events stream from /api/realtime. On Vercel each
// open stream kept a Function instance alive for as long as an admin tab was
// open, which used up the Hobby plan's Fluid Provisioned Memory and paused
// deployments. Now one shared timer signals every POLL_MS while the tab is
// visible, and once as soon as the tab becomes visible again. Changes show up
// within POLL_MS instead of instantly; nothing runs while the tab is hidden.

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 20_000;

let timer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

const messageListeners = new Set<() => void>();

function notify() {
  if (document.visibilityState === 'visible') messageListeners.forEach((l) => l());
}

function onVisibility() {
  notify();
}

function start() {
  if (timer) return;
  timer = setInterval(notify, POLL_MS);
  document.addEventListener('visibilitychange', onVisibility);
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisibility);
}

export function useAdminRealtime(onChange: () => void): { connected: boolean } {
  const onChangeRef = useRef(onChange);
  // Polling has no connection to lose; each refetch reports its own errors.
  const [connected] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const onMessage = () => onChangeRef.current();
    messageListeners.add(onMessage);
    subscriberCount += 1;
    start();
    return () => {
      messageListeners.delete(onMessage);
      subscriberCount -= 1;
      if (subscriberCount <= 0) stop();
    };
  }, []);

  return { connected };
}
