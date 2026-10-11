'use client';

// One small data-layer hook shared by Orders / Overview / Payouts / Analytics:
// fetch on mount, then re-fetch on an interval WHILE THE TAB IS VISIBLE,
// pausing when it is hidden (document.visibilityState) to save the owner's
// battery and our API quota — and re-fetching immediately on the way back so a
// tab left in the background isn't stale. It also returns a manual refetch(),
// so a mutation (Accept/Reject an order) can refresh instantly without waiting
// for the next tick.
//
// Deliberately NOT TanStack Query: one store, a handful of pages, no shared
// cache or request dedup needed, and it is not already a dependency — a focused
// hook is less to reason about than a query client (repo CLAUDE.md: no new deps,
// no premature abstraction).

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LiveData<T> {
  data: T | undefined;
  // True only until the FIRST load settles — background polls never flip this,
  // so the page never flashes its skeleton on an interval tick.
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

export function useLiveData<T>(fetcher: () => Promise<T>, intervalMs: number): LiveData<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  // Hold the latest fetcher without re-arming the interval every render — a
  // caller passing an inline arrow would otherwise reset the timer each tick.
  // Updated in an effect (never during render) so it's lint-clean.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Guards a setState after the component unmounts mid-request.
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(undefined);
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => void load(), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        void load(); // catch up on whatever changed while the tab was hidden
        start();
      } else {
        stop(); // paused — don't poll a backgrounded tab
      }
    }

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load, intervalMs]);

  return { data, isLoading, error, refetch: load };
}
