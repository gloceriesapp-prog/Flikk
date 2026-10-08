import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { API_BASE_URL } from '../../../api/baseUrl';
import { ConnectionPolicy } from './connection';

export interface InventoryEvent { storeIds: string[]; zoneIds: string[]; storeChanged: boolean; refresh?: boolean }
export interface InventoryScope { storeIds: string[]; zoneIds: string[] }
type Kind = 'content' | 'inventory' | 'settings' | 'config';
type Listener = (event: Kind, inventory?: InventoryEvent) => void;
const listeners = new Map<Listener, InventoryScope>();
let source: EventSource | null = null;
let appSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let scopeTimer: ReturnType<typeof setTimeout> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const pending = new Set<Kind>();
let stock: InventoryEvent = { storeIds: [], zoneIds: [], storeChanged: false };
let scopeKey = '';
function notify(event: Kind, inventory?: InventoryEvent) {
  pending.add(event);
  if (inventory) stock = { storeIds: [...new Set([...stock.storeIds, ...inventory.storeIds])],
    zoneIds: [...new Set([...stock.zoneIds, ...inventory.zoneIds])], storeChanged: stock.storeChanged || inventory.storeChanged,
    refresh: stock.refresh || inventory.refresh };
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const events = [...pending]; const details = stock;
    pending.clear(); stock = { storeIds: [], zoneIds: [], storeChanged: false };
    for (const [listener, scope] of listeners) for (const kind of events) {
      if (kind !== 'inventory' || details.refresh || scope.storeIds.some(id => details.storeIds.includes(id)) ||
        (details.storeChanged && scope.zoneIds.some(id => details.zoneIds.includes(id)))) listener(kind, details);
    }
  }, 250);
}
function closeSource() { source?.removeAllEventListeners(); source?.close(); source = null; }
function scopeOverflow() {
  return new Set([...listeners.values()].flatMap(s => s.storeIds)).size > 100 ||
    new Set([...listeners.values()].flatMap(s => s.zoneIds)).size > 10;
}
function scope() {
  return { storeIds: [...new Set([...listeners.values()].flatMap(s => s.storeIds))].sort().slice(0, 100),
    zoneIds: [...new Set([...listeners.values()].flatMap(s => s.zoneIds))].sort().slice(0, 10) };
}
const policy = new ConnectionPolicy(() => {
  notify('content'); notify('settings'); notify('config'); notify('inventory', { ...scope(), storeChanged: true, refresh: true });
}, () => {
  closeSource();
  const interests = scope();
  const current = new EventSource(`${API_BASE_URL}/home/content/events?stores=${interests.storeIds.join(',')}&zones=${interests.zoneIds.join(',')}`,
    { pollingInterval: 0, timeoutBeforeConnection: 0 });
  source = current;
  current.addEventListener('message', event => {
    if (source !== current || !event.data) return;
    try {
      const value = JSON.parse(event.data);
      if (value.type === 'health' && typeof value.healthy === 'boolean') policy.pulse(value.healthy && !scopeOverflow(), value.recovery === true);
      else if (value.type === 'content' || value.type === 'settings' || value.type === 'config') notify(value.type);
      else if (value.type === 'inventory' && Array.isArray(value.storeIds) && Array.isArray(value.zoneIds) &&
        value.storeIds.every((id: unknown) => typeof id === 'string') && value.zoneIds.every((id: unknown) => typeof id === 'string')) {
        notify('inventory', { storeIds: value.storeIds, zoneIds: value.zoneIds, storeChanged: value.storeChanged === true });
      }
    } catch { /* Invalid or old-server events cannot establish stream health. */ }
  });
  current.addEventListener('error', () => { if (source === current) { closeSource(); policy.failed(); } });
  current.addEventListener('close', () => { if (source === current) { closeSource(); policy.failed(); } });
  // Includes initial connections that never receive a health frame.
  policy.pulse(false);
});
function stop() {
  policy.stop(); closeSource();
  if (scopeTimer) clearTimeout(scopeTimer); scopeTimer = null;
  if (timer) clearTimeout(timer); timer = null;
  pending.clear(); stock = { storeIds: [], zoneIds: [], storeChanged: false };
}
function start() {
  if (!listeners.size || (AppState.currentState && AppState.currentState !== 'active')) return;
  const key = JSON.stringify(scope());
  if (source && key === scopeKey) return;
  scopeKey = key; policy.stop(); policy.start();
}
function scheduleScope() {
  if (scopeTimer) clearTimeout(scopeTimer);
  scopeTimer = setTimeout(() => { scopeTimer = null; start(); }, 300);
}
export function subscribeHomeContent(listener: Listener, interests: InventoryScope = { storeIds: [], zoneIds: [] }) {
  listeners.set(listener, interests);
  if (!appSubscription) appSubscription = AppState.addEventListener('change', state => {
    if (state === 'active') start(); else stop();
  });
  scheduleScope();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { stop(); appSubscription?.remove(); appSubscription = null; }
    else scheduleScope();
  };
}
