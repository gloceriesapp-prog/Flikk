export interface OrderStreamTransport extends Pick<XMLHttpRequest, 'onprogress' | 'onreadystatechange' | 'onerror' | 'ontimeout'> {
  responseText: string; readyState: number; status: number;
  open(method: string, url: string): void; setRequestHeader(name: string, value: string): void;
  send(): void; abort(): void;
}
export function openOrderStream(options: { url: string; accessToken: string;
  createTransport: () => OrderStreamTransport; onChange: () => void;
  onHealth: (healthy: boolean) => void; onEnd: () => void }): () => void {
  const xhr = options.createTransport();
  let stopped = false, offset = 0, buffer = '';
  let watchdog: ReturnType<typeof setTimeout>;
  const cleanup = () => { clearTimeout(watchdog); xhr.onprogress = xhr.onreadystatechange = xhr.onerror = xhr.ontimeout = null; xhr.abort(); };
  const end = () => { if (stopped) return; stopped = true; cleanup(); options.onHealth(false); options.onEnd(); };
  const touch = () => { clearTimeout(watchdog); watchdog = setTimeout(end, 45000); };
  const read = () => {
    if (stopped) return;
    if (xhr.readyState >= 2 && xhr.status >= 400) { end(); return; }
    const text = xhr.responseText || '';
    if (text.length > 262144) { end(); return; }
    buffer += text.slice(offset); offset = text.length; touch();
    const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      try {
        const event = JSON.parse(data);
        if (event.type === 'orders_changed') options.onChange();
        else if (event.type === 'health' && typeof event.healthy === 'boolean') { options.onHealth(event.healthy); if (event.healthy) options.onChange(); }
      } catch { /* Incomplete or unknown signals never modify the order queue. */ }
    }
    if (xhr.readyState === 4) end();
  };
  xhr.open('GET', options.url);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  // Never put authentication in a URL, logs or the event payload.
  xhr.setRequestHeader('Authorization', `Bearer ${options.accessToken}`);
  xhr.onprogress = read; xhr.onreadystatechange = read; xhr.onerror = end; xhr.ontimeout = end;
  touch();
  try { xhr.send(); } catch { end(); }
  return () => { if (!stopped) { stopped = true; cleanup(); } };
}
