import { distanceMeters, filterFix, isUsableLocationFix, type FilteredFix, type RawFix } from '../src/location/locationFilter';

const HOME = { latitude: 13.2167, longitude: 74.7469 };
// ~1 m of latitude in degrees.
const M = 1 / 111_320;

function fix(northMeters: number, accuracy: number | null, seconds: number): RawFix {
  return { latitude: HOME.latitude + northMeters * M, longitude: HOME.longitude, accuracy, timestamp: seconds * 1000 };
}

function run(fixes: RawFix[]): FilteredFix {
  let state: FilteredFix | null = null;
  for (const f of fixes) state = filterFix(state, f);
  return state!;
}

describe('filterFix', () => {
  it('starts from the first fix', () => {
    const state = filterFix(null, fix(0, 12, 0));
    expect(state).toMatchObject({ latitude: HOME.latitude, longitude: HOME.longitude, accuracy: 12, rejected: 0 });
  });

  it('keeps a still phone steady while raw fixes wander ±8 m', () => {
    const noise = [0, 8, -6, 7, -8, 5, -7, 6, -5, 8];
    const state = run(noise.map((n, i) => fix(n, 10, i)));
    expect(distanceMeters(HOME, state)).toBeLessThan(3);
    expect(state.accuracy).toBe(10);
  });

  it('ignores a single far jump from a vague network fix', () => {
    const state = run([fix(0, 8, 0), fix(1, 8, 1), fix(0, 8, 2), fix(150, 30, 3)]);
    expect(distanceMeters(HOME, state)).toBeLessThan(2);
    expect(state.rejected).toBe(1);
  });

  it('accepts the new place once jumps keep coming (the person really moved)', () => {
    const state = run([fix(0, 8, 0), fix(150, 8, 1), fix(151, 8, 2), fix(150, 8, 3)]);
    expect(distanceMeters({ latitude: HOME.latitude + 150 * M, longitude: HOME.longitude }, state)).toBeLessThan(2);
    expect(state.rejected).toBe(0);
  });

  it('lets a sharp GPS fix pull a vague first fix most of the way', () => {
    const state = run([fix(0, 60, 0), fix(40, 5, 1)]);
    expect(distanceMeters(HOME, state)).toBeGreaterThan(38);
  });

  it('follows someone walking', () => {
    const walk = Array.from({ length: 20 }, (_, i) => fix(i * 1.4, 6, i));
    const state = run(walk);
    expect(distanceMeters({ latitude: HOME.latitude + 19 * 1.4 * M, longitude: HOME.longitude }, state)).toBeLessThan(6);
  });

  it('treats a missing accuracy as vague, not exact', () => {
    expect(filterFix(null, fix(0, null, 0)).accuracy).toBe(50);
    expect(filterFix(null, fix(0, 0, 0)).accuracy).toBe(50);
  });

  it('does not move on each stationary sample when reported accuracy fluctuates', () => {
    let state = filterFix(null, fix(0, 10, 0));
    for (let i = 1; i <= 120; i++) {
      state = filterFix(state, fix(i % 2 ? 8 : -8, [8, 10, 12][i % 3], i));
      expect(distanceMeters(HOME, state)).toBe(0);
    }
  });

  it('uses a stationary speed reading to suppress same-direction GPS drift', () => {
    let state = filterFix(null, fix(0, 10, 0));
    for (let i = 1; i <= 30; i++) {
      state = filterFix(state, { ...fix(9 + i % 3, 10, i), speed: 0 });
      expect(distanceMeters(HOME, state)).toBe(0);
    }
  });

  it('follows real movement immediately when the provider reports walking speed', () => {
    const walk = Array.from({ length: 20 }, (_, i) => ({ ...fix(i * 1.4, 6, i), speed: 1.4 }));
    const state = run(walk);
    expect(distanceMeters(walk[19], state)).toBeLessThan(2);
  });

  it('can follow sustained displacement even if speed is unavailable or stuck at zero', () => {
    const walk = Array.from({ length: 40 }, (_, i) => ({ ...fix(i * 1.4, 6, i), speed: 0 }));
    const state = run(walk);
    expect(distanceMeters(HOME, state)).toBeGreaterThan(40);
  });

  it('does not rebase after unrelated GPS outliers', () => {
    const state = run([fix(0, 8, 0), fix(150, 8, 1), fix(-150, 8, 2), fix(300, 8, 3)]);
    expect(distanceMeters(HOME, state)).toBe(0);
    expect(state.rejected).toBe(1);
  });

  it('ignores out-of-order cached samples and badly degraded accuracy', () => {
    const initial = filterFix(null, fix(0, 8, 10));
    expect(filterFix(initial, fix(150, 8, 9))).toBe(initial);
    expect(filterFix(initial, fix(100, 150, 11))).toBe(initial);
  });

  it('holds small stationary movements and keeps a realistic accuracy floor', () => {
    const state = run(Array.from({ length: 100 }, (_, i) => fix(i % 2, 8, i)));
    expect(distanceMeters(HOME, state)).toBe(0);
    expect(state.accuracy).toBeGreaterThanOrEqual(8);
  });

  it('admits only fresh, finite, geographically valid fixes with usable accuracy', () => {
    const now = 20_000;
    expect(isUsableLocationFix(fix(0, 10, 20), now)).toBe(true);
    expect(isUsableLocationFix(fix(0, 10, 0), now)).toBe(false);
    expect(isUsableLocationFix(fix(0, 250, 20), now)).toBe(false);
    expect(isUsableLocationFix({ ...fix(0, 10, 20), latitude: NaN }, now)).toBe(false);
    expect(isUsableLocationFix({ ...fix(0, 10, 20), longitude: 181 }, now)).toBe(false);
    expect(isUsableLocationFix(fix(0, 10, 30), now)).toBe(false);
  });
});


it('reanchors a coarse startup preview to a materially better precise fix', () => {
  const time = Date.now();
  const first = filterFix(null, { latitude: 13.2, longitude: 74.7, accuracy: 35, timestamp: time });
  const precise = { latitude: 13.2001, longitude: 74.7, accuracy: 20, timestamp: time + 1000 };
  const next = filterFix(first, precise);
  expect(next.latitude).toBe(precise.latitude);
  expect(next.longitude).toBe(precise.longitude);
});
