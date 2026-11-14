import type { Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { StreamAdmission, streamLimit, writeStreamFrame } from '../home-sync/admission.js';
import { StoreOrderSignals } from './orderSignals.js';

const signals = new StoreOrderSignals();
const admission = new StreamAdmission(streamLimit(process.env.PARTNER_SSE_MAX_CONNECTIONS, 2000), streamLimit(process.env.PARTNER_SSE_MAX_PER_IP, 100));
const clients = new Set<Response>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let healthy = false;
let flush: ReturnType<typeof setTimeout> | undefined;
const changedStores = new Set<string>();
function start() {
  if (channel) return;
  const current = supabase.channel('partner-order-queue');
  channel = current;
  current.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
    if (channel !== current) return;
    for (const row of [payload.new, payload.old]) {
      const id = (row as { store_id?: string }).store_id;
      if (id && clients.size) changedStores.add(id);
    }
    // Bound fan-out: many writes in one transaction produce one signal/shop.
    if (!flush && changedStores.size) {
      flush = setTimeout(() => { const ids = [...changedStores]; changedStores.clear(); flush = undefined; signals.changed(ids); }, 75);
      flush.unref();
    }
  }).subscribe(status => {
    if (channel !== current) return;
    healthy = status === 'SUBSCRIBED';
    signals.health(healthy);
    // Reconnect gaps are recovered with a fresh, authorized queue read.
    if (healthy) signals.changed([...changedStores]);
  });
}
export async function stopPartnerOrderStreams(): Promise<void> {
  for (const response of clients) response.end();
  clients.clear(); healthy = false;
  if (flush) clearTimeout(flush);
  flush = undefined; changedStores.clear();
  const current = channel; channel = null;
  if (current) await supabase.removeChannel(current);
}
export function attachPartnerOrderStream(req: Request, res: Response, storeId: string): void {
  const release = admission.acquire(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  if (!release) { res.set('Retry-After', '30').status(503).json({ error: 'Live updates are busy. Please retry.' }); return; }
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-store, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders(); req.socket.setTimeout(0); req.socket.setKeepAlive(true, 30000);
  clients.add(res);
  const unsubscribe = signals.subscribe(storeId, event => { writeStreamFrame(res, `data: ${JSON.stringify(event)}\n\n`); });
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true; clearInterval(heartbeat); clearTimeout(expiry); unsubscribe(); clients.delete(res); release();
    if (!clients.size) void stopPartnerOrderStreams().catch(() => {});
  };
  const heartbeat = setInterval(() => { writeStreamFrame(res, ': heartbeat\n\n'); }, 15000);
  // Reauthorize membership, suspension and token validity on every reconnect.
  const expiry = setTimeout(() => res.end(), 55000);
  heartbeat.unref(); expiry.unref();
  res.once('close', cleanup); res.once('error', cleanup);
  try { start(); } catch { res.end(); return; }
  writeStreamFrame(res, `data: ${JSON.stringify({ type: 'health', healthy })}\n\n`);
}
