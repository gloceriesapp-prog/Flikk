import { Router, type Response } from 'express';
import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { invalidateInventoryCache, invalidateShortCache } from '../middleware/shortCache.js';
import { invalidateAuthUser, invalidateAllAuthContexts } from '../auth/authenticate.js';
import { HomeBroker, parseScope, type HomeEvent, type InventorySignal } from '../home-sync/broker.js';

import { StreamAdmission, streamLimit, writeStreamFrame } from '../home-sync/admission.js';
import { metrics } from '../observability/metrics.js';

const admission = new StreamAdmission(streamLimit(process.env.SSE_MAX_CONNECTIONS, 2000), streamLimit(process.env.SSE_MAX_CONNECTIONS_PER_IP, 100));

export const homeContentRouter = Router();
const broker = new HomeBroker<Response>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let healthy = false;
let healthGeneration = 0;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTask: Promise<void> | null = null;
let lastCleanupWarning = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pending = new Map<string, InventorySignal>();

function send(res: Response, event: HomeEvent) {
  const result = writeStreamFrame(res, `data: ${JSON.stringify(event)}\n\n`);
  if (result === 'backpressure' || result === 'error')
    metrics.increment('flikk_sse_disconnects_total', { reason: result });
}
function broadcast(event: HomeEvent) {
  for (const res of broker.recipients(event)) send(res, event);
}
function contentChanged(type: 'content' | 'settings') {
  if (type === 'content') invalidateShortCache('/stores');
  invalidateShortCache(type === 'content' ? '/home-tabs' : '/delivery-settings');
  broadcast({ type });
}
function inventoryChanged(row: Record<string, unknown>) {
  if (typeof row.store_id !== 'string') return;
  const id = row.store_id;
  const zones = Array.isArray(row.zone_ids) ? row.zone_ids.filter((v): v is string => typeof v === 'string') : [];
  const previous = pending.get(id);
  pending.set(id, { storeIds: [id], zoneIds: [...new Set([...(previous?.zoneIds ?? []), ...zones])],
    storeChanged: previous?.storeChanged === true || row.store_changed === true });
  // Cache correctness is independent of whether this instance owns streams.
  invalidateInventoryCache(id, row.store_changed === true);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    for (const signal of pending.values()) broadcast({ type: 'inventory', ...signal });
    pending.clear();
  }, 250);
}
async function pruneSignals() {
  try {
    // Bound work per cycle; SKIP LOCKED coordinates horizontal instances.
    for (let batch = 0; batch < 3; batch++) {
      const { data, error } = await supabase.rpc('prune_inventory_signals');
      if (error) throw error;
      if (typeof data !== 'number' || data < 5000) break;
    }
  } catch (error) {
    if (Date.now() - lastCleanupWarning > 300_000) {
      lastCleanupWarning = Date.now();
      logger.warn({ err: error }, 'Inventory signal cleanup unavailable; verify migration 068');
    }
  }
}
export function startHomeContentSync() {
  if (channel) return;
  cleanupTimer = setInterval(() => {
    if (!cleanupTask) cleanupTask = pruneSignals().finally(() => { cleanupTask = null; });
  }, 10_000);
  cleanupTimer.unref();
  heartbeat = setInterval(() => broadcast({ type: 'health', healthy, recovery: false }), 20_000);
  heartbeat.unref();
  channel = supabase.channel('customer-home-content')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'home_content' }, () => contentChanged('content'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'home_tabs' }, () => contentChanged('content'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
      const id = (payload.new as { id?: string }).id ?? (payload.old as { id?: string }).id;
      if (id) invalidateAuthUser(id);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, () => { invalidateShortCache('/stores'); contentChanged('content'); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_signals' }, payload => inventoryChanged(payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory_signals' }, payload => inventoryChanged(payload.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_settings' }, () => contentChanged('settings'))
    .subscribe(status => {
      // Discard authorization snapshots across a realtime connection gap.
      invalidateAllAuthContexts();
      const current = channel;
      const generation = ++healthGeneration;
      healthy = false;
      if (status === 'SUBSCRIBED') {
        // An open stream is not proof that the required migration exists.
        void supabase.from('inventory_signals').select('store_id').limit(1).then(({ error }) => {
          if (channel !== current || !current || generation !== healthGeneration) return;
          healthy = !error;
          invalidateShortCache('/stores');
          invalidateShortCache('/categories');
          invalidateShortCache('/delivery-settings');
          invalidateShortCache('/home-tabs');
          broadcast({ type: 'health', healthy, recovery: healthy });
          if (error) logger.warn({ code: error.code }, 'Inventory sync unavailable; apply migration 068. Customers use fallback refresh.');
        });
      } else {
        broadcast({ type: 'health', healthy: false, recovery: false });
        logger.warn({ status }, 'Home realtime unavailable; customers use fallback refresh');
      }
    });
}
export async function stopHomeContentSync(): Promise<void> {
  for (const res of broker.recipients({ type: 'content' })) res.end();
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = null;
  if (heartbeat) clearInterval(heartbeat);
  if (flushTimer) clearTimeout(flushTimer);
  heartbeat = null; flushTimer = null; pending.clear(); healthy = false;
  const previous = channel; channel = null;
  if (previous) await supabase.removeChannel(previous);
  if (cleanupTask) await cleanupTask;
}
homeContentRouter.get('/events', (req, res) => {
  const storeIds = parseScope(req.query.stores, 100);
  const zoneIds = parseScope(req.query.zones, 10);
  if (!storeIds || !zoneIds) { res.status(400).json({ error: 'Invalid inventory scope' }); return; }
  const release = admission.acquire(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  if (!release) {
    metrics.increment('flikk_sse_rejected_total');
    res.set('Retry-After', '30').status(503).json({ error: 'Live updates temporarily busy' }); return;
  }
  metrics.gauge('flikk_sse_connections', admission.size);
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const removeScope = broker.add(res, { storeIds, zoneIds });
  const remove = () => { removeScope(); release(); metrics.gauge('flikk_sse_connections', admission.size); };
  req.socket.setTimeout(0);
  req.socket.setKeepAlive(true, 30000);
  startHomeContentSync();
  send(res, { type: 'health', healthy, recovery: false });
  // IncomingMessage.close can mean the GET request finished, while its
  // streaming response is still open. Release only when the response closes.
  res.once('close', remove);
  res.once('error', () => { remove(); res.destroy(); });
});

homeContentRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('home_content')
      .select('tab_key, home_tab_id, revision, updated_at, content')
      .order('tab_key');
    if (error) throw error;
    res.set('Cache-Control', 'no-store');
    res.json(
      (data ?? []).map((row) => ({
        tabKey: row.tab_key,
        homeTabId: row.home_tab_id,
        revision: row.revision,
        updatedAt: row.updated_at,
        content: row.content,
      })),
    );
  } catch (err) {
    next(err);
  }
});
