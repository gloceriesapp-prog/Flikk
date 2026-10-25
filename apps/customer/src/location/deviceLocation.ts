import * as Location from 'expo-location';
import { withDeadline } from '../utils/deadline';
import { isUsableLocationFix, type RawFix } from './locationFilter';

const RECENT_FIX_MS = 2_000;
const QUICK_FIX_ACCURACY_M = 25;
const LIVE_FIX_MAX_AGE_MS = 5_000;
const USABLE_LIVE_ACCURACY_M = 50;
const PRECISION_GRACE_MS = 2_500;
const ACQUISITION_TIMEOUT_MS = 15_000;
const LOCATION_ERROR = 'A fresh, accurate location is not available. Move near a window or choose your pin manually.';
let recentFix: RawFix | null = null;
let pendingFix: Promise<RawFix> | null = null;

export function rememberDeviceFix(fix: RawFix): void {
  if (isUsableLocationFix(fix) && (!recentFix || fix.timestamp >= recentFix.timestamp)) recentFix = fix;
}

function isRecentPreciseFix(fix: RawFix): boolean {
  return isUsableLocationFix(fix) && Date.now() - fix.timestamp <= RECENT_FIX_MS
    && fix.accuracy != null && fix.accuracy > 0 && fix.accuracy <= QUICK_FIX_ACCURACY_M;
}

export function isUsableDeviceFix(fix: RawFix, now = Date.now()): fix is RawFix & { accuracy: number } {
  return isUsableLocationFix(fix, now) && now - fix.timestamp <= LIVE_FIX_MAX_AGE_MS
    && fix.accuracy != null && fix.accuracy > 0 && fix.accuracy <= USABLE_LIVE_ACCURACY_M;
}

// A coarse live preview must not bypass precision acquisition on recenter.
export function getRecentDeviceFix(): RawFix | null {
  return recentFix && isRecentPreciseFix(recentFix)
    ? { ...recentFix } : null;
}

function nativeFix(position: Location.LocationObject | null): RawFix | null {
  return position && { latitude: position.coords.latitude, longitude: position.coords.longitude,
    accuracy: position.coords.accuracy, speed: position.coords.speed, timestamp: position.timestamp };
}

// Race the live watch, single read and strictly fresh cache. Prefer a precise
// reading immediately; after a short refinement window an honest <=50 m live
// preview is better than an error. Preserve its reported uncertainty for the UI.
function acquireDeviceFix(): Promise<RawFix> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let freshFailed = false;
    let watchFailed = false;
    let cachedFailed = false;
    let graceElapsed = false;
    let bestCandidate: RawFix | null = null;
    let latestCandidate: RawFix | null = null;
    let subscription: Location.LocationSubscription | null = null;
    const timer = setTimeout(() => finish(currentCandidate()), ACQUISITION_TIMEOUT_MS);
    const graceTimer = setTimeout(() => {
      graceElapsed = true;
      const candidate = currentCandidate();
      if (candidate) finish(candidate);
    }, PRECISION_GRACE_MS);

    function currentCandidate(): RawFix | null {
      if (bestCandidate && isUsableDeviceFix(bestCandidate)) return bestCandidate;
      return latestCandidate && isUsableDeviceFix(latestCandidate) ? latestCandidate : null;
    }

    function finish(fix: RawFix | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(graceTimer);
      subscription?.remove();
      if (fix) {
        rememberDeviceFix(fix);
        resolve(fix);
      } else reject(new Error(LOCATION_ERROR));
    }

    function providerFailed(provider: 'fresh' | 'watch' | 'cached') {
      if (provider === 'fresh') freshFailed = true;
      else if (provider === 'watch') watchFailed = true;
      else cachedFailed = true;
      if (freshFailed && watchFailed && cachedFailed && !currentCandidate()) finish(null);
    }

    function acceptLivePosition(position: Location.LocationObject) {
      if (settled) return;
      const fix = nativeFix(position);
      if (!fix || !isUsableDeviceFix(fix)) return;
      if (fix.accuracy <= QUICK_FIX_ACCURACY_M) {
        finish(fix);
        return;
      }
      const candidate = currentCandidate();
      if (!latestCandidate || fix.timestamp >= latestCandidate.timestamp) latestCandidate = fix;
      if (!candidate || fix.accuracy < (candidate.accuracy ?? Infinity)
        || (fix.accuracy === candidate.accuracy && fix.timestamp > candidate.timestamp)) bestCandidate = fix;
      if (graceElapsed) finish(currentCandidate());
    }

    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      acceptLivePosition,
      () => providerFailed('watch'),
    ).then(watch => {
      // Registration can finish after a cached result or timeout has won.
      if (settled) watch.remove();
      else subscription = watch;
    }, () => providerFailed('watch'));

    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }).then(position => {
      acceptLivePosition(position);
      providerFailed('fresh'); // A single read cannot supply another refinement.
    }, () => providerFailed('fresh'));

    void withDeadline(Location.getLastKnownPositionAsync({
      maxAge: RECENT_FIX_MS, requiredAccuracy: QUICK_FIX_ACCURACY_M,
    }), 500).then(position => {
      if (settled) return;
      const fix = nativeFix(position);
      if (fix && isRecentPreciseFix(fix)) finish(fix);
      else providerFailed('cached');
    }, () => providerFailed('cached'));
  });
}

// Concurrent callers share one acquisition. Only a precise, recent native fix
// can skip acquisition; displayed/filter coordinates must never enter this cache.
export function getDeviceLocationFix(): Promise<RawFix> {
  if (recentFix && isRecentPreciseFix(recentFix)) return Promise.resolve(recentFix);
  if (pendingFix) return pendingFix;
  pendingFix = acquireDeviceFix().finally(() => { pendingFix = null; });
  return pendingFix;
}
