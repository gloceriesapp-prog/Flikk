'use client';

// Opens app/api/realtime's SSE stream and calls onChange whenever that
// route reports an orders/stores/riders write — i.e. whenever the
// customer, partner, or rider app does something that should update this
// screen. onChange is a plain refetch, not a patch — at MVP order volume
// (CLAUDE.md) re-reading the small set of aggregate queries on every
// change is simpler and less bug-prone than reconciling partial deltas
// into local state.
//
// Auto-reconnects on drop (EventSource does this natively) — no manual
// retry logic needed here.
//
// Returns whether the stream is currently connected — SystemStatusBadge's
// own real signal for "is live sync actually working right now," not a
// fabricated always-on dot.

import { useEffect, useRef, useState } from 'react';

export function useAdminRealtime(onChange: () => void): { connected: boolean } {
  const onChangeRef = useRef(onChange);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const source = new EventSource('/api/realtime');
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = () => onChangeRef.current();
    return () => source.close();
  }, []);

  return { connected };
}
