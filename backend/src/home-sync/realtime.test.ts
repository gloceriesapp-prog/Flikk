import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ currentState: 'active', onChange: undefined as ((value: string) => void) | undefined, remove: vi.fn() }));
const streams = vi.hoisted(() => [] as { url: string; options: { pollingInterval: number }; handlers: Map<string, (event: unknown) => void>; close: ReturnType<typeof vi.fn> }[]);
vi.mock('../../../apps/customer/node_modules/react-native/index.js', () => ({ AppState: {
  get currentState() { return state.currentState; },
  addEventListener: (_: string, fn: (value: string) => void) => { state.onChange = fn; return { remove: state.remove }; },
} }));
vi.mock('../../../apps/customer/node_modules/react-native-sse/index.js', () => ({ default: class {
  handlers = new Map<string, (event: unknown) => void>();
  close = vi.fn();
  constructor(public url: string, public options: { pollingInterval: number }) { streams.push(this); }
  addEventListener(kind: string, fn: (event: unknown) => void) { this.handlers.set(kind, fn); }
  removeAllEventListeners() { this.handlers.clear(); }
} }));
vi.mock('../../../apps/customer/src/api/baseUrl', () => ({ API_BASE_URL: 'https://test.api' }));
import { subscribeHomeContent } from '../../../apps/customer/src/screens/home/content/realtime';
const cleanup: (() => void)[] = [];
beforeEach(() => { vi.useFakeTimers(); state.currentState = 'active'; streams.length = 0; });
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); vi.useRealTimers(); });
function subscribe(fn: ReturnType<typeof vi.fn>, stores: string[]) {
  const stop = subscribeHomeContent(fn, { storeIds: stores, zoneIds: [] }); cleanup.push(stop); return stop;
}
function message(value: unknown) { streams.at(-1)!.handlers.get('message')?.({ data: JSON.stringify(value) }); }
describe('Shared foreground SSE transport', () => {
  it('unions interests into one stream and delivers inventory only to matching listeners', () => {
    const a = vi.fn(); const b = vi.fn(); subscribe(a, ['a']); subscribe(b, ['b']);
    vi.advanceTimersByTime(300); expect(streams).toHaveLength(1);
    expect(streams[0]!.url).toContain('stores=a,b'); expect(streams[0]!.options.pollingInterval).toBe(0);
    message({ type: 'inventory', storeIds: ['a'], zoneIds: [], storeChanged: false });
    vi.advanceTimersByTime(250); expect(a).toHaveBeenCalledTimes(1); expect(b).not.toHaveBeenCalled();
  });
  it('closes and cancels all refreshes in the background, then resumes with current scopes', () => {
    const listener = vi.fn(); subscribe(listener, ['a']); vi.advanceTimersByTime(300);
    state.currentState = 'background'; state.onChange?.('background');
    expect(streams[0]!.close).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(180_000); expect(listener).not.toHaveBeenCalled(); expect(streams).toHaveLength(1);
    state.currentState = 'active'; state.onChange?.('active'); expect(streams).toHaveLength(2);
  });
  it('ignores stale frames from a replaced stream', () => {
    const a = vi.fn(); subscribe(a, ['a']); vi.advanceTimersByTime(300);
    const stale = streams[0]!.handlers.get('message')!;
    subscribe(vi.fn(), ['b']); vi.advanceTimersByTime(300); expect(streams).toHaveLength(2);
    stale({ data: JSON.stringify({ type: 'inventory', storeIds: ['a'], zoneIds: [], storeChanged: false }) });
    vi.advanceTimersByTime(250); expect(a).not.toHaveBeenCalled();
  });
  it('does not treat an HTTP open event as proof of database health', () => {
    const listener = vi.fn(); subscribe(listener, ['a']); vi.advanceTimersByTime(300);
    streams[0]!.handlers.get('open')?.({});
    vi.advanceTimersByTime(75_250);
    expect(listener.mock.calls.some(([kind]) => kind === 'inventory')).toBe(true);
  });
});
