import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const lifecycle = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)> }));
vi.mock('../../../apps/partner-dashboard/node_modules/react/index.js', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: (effect: () => void | (() => void)) => lifecycle.effects.push(effect),
}));
import { useOrderAlertSound } from '../../../apps/partner-dashboard/src/features/order-alerts/useOrderAlertSound';

class Player extends EventTarget {
  static instance: Player;
  paused = true; preload = ''; volume = 1; currentTime = 0;
  load = vi.fn(); pause = vi.fn(() => { this.paused = true; }); removeAttribute = vi.fn();
  play = vi.fn(() => {
    this.paused = false;
    setTimeout(() => { this.paused = true; this.dispatchEvent(new Event('ended')); }, 200);
    return Promise.resolve();
  });
  constructor(public src: string) { super(); Player.instance = this; }
}
let cleanups: Array<() => void> = [];
let interaction: EventTarget;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(100_000); lifecycle.effects = []; cleanups = [];
  interaction = new EventTarget();
  vi.stubGlobal('window', Object.assign(interaction, { setInterval }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('Audio', Player);
});
afterEach(() => { cleanups.forEach(fn => fn()); vi.useRealTimers(); vi.unstubAllGlobals(); });
const makeOrder = () => ({ id: 'one', placed_at: new Date(100_000).toISOString(), acceptance_deadline_at: new Date(160_000).toISOString(), status: 'placed', accepted_at: null as string | null });
function mount(order: ReturnType<typeof makeOrder>) {
  useOrderAlertSound([order]);
  cleanups = lifecycle.effects.map(effect => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === 'function');
}
it('plays the bundled clip at 60% at arrival, 25 seconds and 5 seconds remaining', async () => {
  mount(makeOrder());
  await vi.advanceTimersByTimeAsync(0);
  expect(Player.instance.src).toBe('/audio/partner-alert.wav');
  expect(Player.instance.volume).toBe(0.6);
  expect(Player.instance.play).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(25_000);
  expect(Player.instance.play).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(Player.instance.play).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(Player.instance.play).toHaveBeenCalledTimes(3);
});
it('stops reminders after acceptance', async () => {
  const order = makeOrder(); mount(order);
  await vi.advanceTimersByTimeAsync(1000);
  order.accepted_at = new Date().toISOString();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(Player.instance.play).toHaveBeenCalledTimes(1);
});
it('does not repeatedly retry blocked audio until a user gesture', async () => {
  mount(makeOrder()); await vi.advanceTimersByTimeAsync(1000);
  Player.instance.play.mockImplementation(() => Promise.reject(new Error('Autoplay blocked')));
  await vi.advanceTimersByTimeAsync(24_000);
  const attempts = Player.instance.play.mock.calls.length;
  await vi.advanceTimersByTimeAsync(3000);
  expect(Player.instance.play).toHaveBeenCalledTimes(attempts);
  Player.instance.play.mockImplementation(() => Promise.resolve());
  interaction.dispatchEvent(new Event('pointerdown'));
  await vi.advanceTimersByTimeAsync(0);
  expect(Player.instance.play).toHaveBeenCalledTimes(attempts + 1);
});
