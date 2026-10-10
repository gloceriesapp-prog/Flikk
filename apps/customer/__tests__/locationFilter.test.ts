import { distanceMeters, filterFix, type FilteredFix, type RawFix } from '../src/location/locationFilter';

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
    expect(state.accuracy).toBeLessThan(10);
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
});
