'use client';

// Live-sync hook for the dashboard. Every caller subscribes to ONE shared
// SSE connection to /api/realtime — not one EventSource per component.
//
// Why this matters: the Sidebar, the active page, and several dashboard
// widgets (NeedsAttention, LiveTraffic, SystemStatusBadge, OrdersTable, …)
// all call this hook. A naive "new EventSource() per hook" opens a separate
// long-lived socket for each, and browsers cap ~6 concurrent connections
// per origin on HTTP/1.1 (the dev server). Those persistent SSE sockets
// fill the pool, and then the browser can't open any new request — the next
// page's data fetch and even the RSC navigation just queue forever, which
// shows up as "stuck rendering" / blank content on every sidebar click.
//
// So the connection is a module-level singleton: opened on the first
// subscriber, shared by all, and closed shortly after the last one leaves
// (a small delay so a rapid unmount/remount during navigation doesn't churn
// the socket). onChange is a plain "something changed, refetch" signal.

import { useEffect, useRef, useState } from 'react';

let source: EventSource | null = null;
let subscriberCount = 0;
let connected = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

// Fan-out sets — the one socket's events are dispatched to every subscriber.
const messageListeners = new Set<() => void>();
const connectionListeners = new Set<(connected: boolean) => void>();

function openSource() {
  if (source) return;
  source = new EventSource('/api/realtime');
  source.onopen = () => {
    connected = true;
    connectionListeners.forEach((l) => l(true));
  };
  source.onerror = () => {
    // EventSource auto-reconnects on its own; just reflect the state.
    connected = false;
    connectionListeners.forEach((l) => l(false));
  };
  source.onmessage = () => {
    messageListeners.forEach((l) => l());
  };
}

function closeSourceIfIdle() {
  if (subscriberCount <= 0 && source) {
    source.close();
    source = null;
    connected = false;
  }
}

export function useAdminRealtime(onChange: () => void): { connected: boolean } {
  const onChangeRef = useRef(onChange);
  const [isConnected, setIsConnected] = useState(connected);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const onMessage = () => onChangeRef.current();
    const onConnection = (c: boolean) => setIsConnected(c);

    messageListeners.add(onMessage);
    connectionListeners.add(onConnection);
    subscriberCount += 1;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    openSource();
    setIsConnected(connected);

    return () => {
      messageListeners.delete(onMessage);
      connectionListeners.delete(onConnection);
      subscriberCount -= 1;
      // Defer the close: during a navigation the old page unmounts and the
      // new one mounts within the same tick, so a subscriber count that
      // dips to 0 momentarily shouldn't tear down and re-open the socket.
      closeTimer = setTimeout(closeSourceIfIdle, 1500);
    };
  }, []);

  return { connected: isConnected };
}
