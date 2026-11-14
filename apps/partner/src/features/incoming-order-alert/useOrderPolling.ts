import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { API_BASE_URL } from '../../api/baseUrl';
import { orderPollDelay } from './orderPollDelay';
import { openOrderStream } from './orderStream';

// Live signals are hints; only authenticated queue reads change displayed orders.
// One foreground stream, one serialized refresh loop, bounded fallback/reconnect.
export function useOrderPolling(): void {
  const refresh = useOrdersStore(state => state.refreshUpdates);
  const accessToken = useAuthStore(state => state.accessToken);
  useEffect(() => {
    if (!accessToken) return;
    let stopped = false, running = false, pending = false, live = false, failures = 0, reconnects = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closeStream: (() => void) | undefined;
    const active = () => !stopped && (AppState.currentState == null || AppState.currentState === 'active');
    const tick = async () => {
      if (!active()) return;
      if (running) { pending = true; return; }
      clearTimeout(timer); running = true;
      try {
        do { pending = false; await refresh(); failures = 0; } while (pending && active());
      } catch { failures += 1; }
      finally {
        running = false;
        if (active()) timer = setTimeout(() => void tick(), live && failures === 0 ? 30000 : orderPollDelay(failures));
      }
    };
    const connect = () => {
      if (!active()) return;
      closeStream?.();
      closeStream = openOrderStream({ url: `${API_BASE_URL}/partner/orders/events`, accessToken,
        createTransport: () => new XMLHttpRequest(),
        onChange: () => { void tick(); },
        onHealth: healthy => { live = healthy; if (healthy) reconnects = 0; },
        onEnd: () => {
          live = false;
          void tick();
          if (active()) retry = setTimeout(connect, Math.min(60000, 1000 * 2 ** Math.min(reconnects++, 6)) * (0.85 + Math.random() * 0.3));
        },
      });
    };
    void tick(); connect();
    const listener = AppState.addEventListener('change', state => {
      clearTimeout(timer); clearTimeout(retry); closeStream?.(); closeStream = undefined; live = false;
      if (state === 'active') { void tick(); connect(); }
    });
    return () => { stopped = true; clearTimeout(timer); clearTimeout(retry); closeStream?.(); listener.remove(); };
  }, [refresh, accessToken]);
}
