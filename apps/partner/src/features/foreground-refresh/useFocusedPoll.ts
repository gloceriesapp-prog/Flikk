// Periodic refresh while a screen is focused AND the app is foregrounded.
// The partner app has no realtime stream (see useOrderPolling.ts's own note —
// no Supabase client ships here), so admin-/approval-driven changes to a
// store's catalog, profile, suspension or commission were invisible until a
// manual pull. This is the "sitting on a screen" half of that fix; the
// return-to-foreground half lives in useForegroundRefresh.
//
// Ticks are skipped (not torn down) while backgrounded: the interval stays
// armed but no-ops unless AppState is 'active', so it never fetches off-screen
// and useForegroundRefresh handles the catch-up refetch the moment the app
// returns to active. Interval is cleared on blur/unmount via useFocusEffect's
// own cleanup — no tight loop, no leak.
//
// `onPoll` must be stable (wrap in useCallback, or pass a Zustand action
// selector result, which is already stable) — it is a dependency of the
// focus effect, so a fresh function each render would restart the interval.
import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useFocusedPoll(onPoll: () => void, intervalMs: number): void {
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        if (AppState.currentState !== 'active') return;
        onPoll();
      }, intervalMs);
      return () => clearInterval(interval);
    }, [onPoll, intervalMs]),
  );
}
