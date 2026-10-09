// Splits the app into the five states an account can be in — this is the
// "becomes a RootNavigator reading useAuthStore" App.tsx has been
// pointing at since before any of this existed:
//
// 1. Not hydrated yet (checking SecureStore), OR the fixed WELCOME_
//    DURATION_MS splash timer hasn't elapsed yet → WelcomeScreen, a real
//    timed brand gate shown on EVERY cold open regardless of how fast
//    hydration itself resolves — same pattern apps/customer's own
//    RootNavigator.tsx/WelcomeScreen.tsx already establish, not a
//    loading spinner with a logo slapped on. Whichever finishes last —
//    the timer or hydration/status-check — is what actually reveals the
//    real stack.
// 2. No session → AuthNavigator, starting at Login (no separate tappable
//    "Get Started" step anymore — per an explicit ask to drop it, this
//    screen's own timed gate above already IS the brand moment).
// 3. Session, no store, wizard not submitted yet → AuthNavigator again,
//    dropped straight onto Store Setup — a returning owner who closed the
//    app mid-registration shouldn't replay Welcome/Login/OTP.
// 4. Session, no store, but application_submitted → WaitingApprovalScreen,
//    standalone (no tab chrome — specs/00-foundation/auth-and-roles.md's
//    "full app-state gate," not endpoint-level filtering). A real `stores`
//    row only gets created at approval time now (backend's
//    storeOnboarding.ts's own note), so "no store yet" alone can't tell a
//    submitted application apart from an abandoned wizard anymore —
//    application_submitted is what actually distinguishes them.
// 5. Session + store (only ever true post-approval) → AppNavigator, the
//    real app shell. is_approved is still checked too, defense in depth —
//    a real store existing should always mean approved given how it's
//    created now, but this doesn't trust that invariant blindly.
//
// Also re-checks approval/store/application status once after hydration
// when a token exists — useAuthStore.ts's own note explains why that
// triple isn't persisted alongside the token (a returning session could
// easily be approved since the last time the app was open; trusting a
// stale local flag would show the wrong screen).

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAccountStatus } from '../api/auth';
import { ApiError } from '../api/client';
import {
  flushPendingNotificationTap,
  registerPushToken,
  watchNotificationTaps,
  watchPushTokenRotation,
} from '../features/push-notifications/registerPushToken';
import { WaitingApprovalScreen } from '../screens/onboarding/WaitingApprovalScreen';
import { PartnerSuspendedScreen } from '../screens/onboarding/PartnerSuspendedScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import { navigationRef } from './navigationRef';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

// Same fixed duration apps/customer's own RootNavigator.tsx uses — shown
// on every cold open, always, not just the first ever launch.
const WELCOME_DURATION_MS = 2000;

// Dev-only: flip to true to jump straight into the onboarding wizard
// (OnboardingIntro → StoreDetails → …) without a real token/no-store
// account. OnboardingIntro's draft fetch fails silently and falls back to
// an empty draft, so the whole flow is walkable with no backend. __DEV__
// guards it out of any production build. Set back to false when done.
// ponytail: a plain constant, not a settings toggle — it's a dev peek.
const DEV_FORCE_ONBOARDING = false;

export function RootNavigator() {
  const {
    accessToken,
    isApproved,
    hasStore,
    applicationSubmitted,
    isHydrated,
    hydrate,
    setApproved,
    setHasStore,
    setApplicationSubmitted,
    setRejection,
    partnerSuspended,
    setPartnerSuspension,
    clear,
  } = useAuthStore();
  const [statusChecked, setStatusChecked] = useState(false);
  const [welcomeElapsed, setWelcomeElapsed] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const id = setTimeout(() => setWelcomeElapsed(true), WELCOME_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  // Registered once per fresh login (accessToken change), same as the
  // status recheck below — a pending owner still gets their token saved
  // now (backend's POST /auth/push-token is requireAuth only, not
  // requireApproved) so admin's approve action can reach them the instant
  // it happens, not only after this app is reopened.
  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    void registerPushToken();
  }, [isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    const stopRotation = watchPushTokenRotation();
    const stopTaps = watchNotificationTaps();
    return () => {
      stopRotation();
      stopTaps();
    };
  }, [isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;

    let cancelled = false;
    checkAccountStatus()
      .then(({ is_approved, has_store, application_submitted, is_rejected, rejection_reason, partner_suspended, partner_suspended_reason }) => {
        if (cancelled) return;
        setApproved(is_approved);
        setHasStore(has_store);
        setApplicationSubmitted(application_submitted);
        setRejection(!!is_rejected, rejection_reason ?? null);
        setPartnerSuspension(partner_suspended === true, partner_suspended_reason ?? null);
      })
      .catch((err) => {
        // A 401 here means the stored token is genuinely invalid —
        // the backend rejected it outright,
        // it's not coming back on its own. Left uncleared, this token
        // stays in SecureStore forever: accessToken keeps looking
        // "logged in" to RootNavigator's own branch below, so the app
        // never falls back to Welcome/Login and just gets stuck wherever
        // hasStore/isApproved's stale local defaults happen to point.
        // Any other failure (network blip, backend genuinely down) is
        // left alone — a possibly-still-valid session shouldn't be logged
        // out just because one status check didn't get through.
        if (err instanceof ApiError && err.status === 401) {
          void clear();
        }
      })
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });

    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs when accessToken changes (a fresh login),
    // not on every isApproved/hasStore write — those are this effect's
    // own output, re-running on them would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken]);

  // Cold-start gate only — hydration + the fixed splash timer. This must
  // NEVER also cover "just logged in, checking account status": accessToken
  // changes every time OtpVerificationScreen calls setSession (a completely
  // normal mid-session event, not a fresh app launch), and statusChecked
  // resets to false on that same change (the effect above's own note on
  // why) — folding that into this same condition was the actual bug behind
  // "tapping Continue on OTP takes me back to the Welcome screen." Welcome
  // is a real branded splash meant for app open, not something that should
  // flash on every login.
  const isColdStart = !isHydrated || !welcomeElapsed;

  if (isColdStart) {
    return <WelcomeScreen />;
  }

  // Past cold start, but a fresh login's own status check hasn't resolved
  // yet — a plain, unbranded spinner, not WelcomeScreen again.
  const isCheckingLoginStatus = !!accessToken && !statusChecked;

  if (isCheckingLoginStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNotificationTap}>
      {__DEV__ && DEV_FORCE_ONBOARDING ? (
        <AuthNavigator key="dev-onboarding" initialRouteName="OnboardingIntro" />
      ) : !accessToken ? (
        // Keyed by accessToken so a session clear (missing/expired token —
        // see api/client.ts's own note on the exact bug this fixes) always
        // gets a genuinely fresh AuthNavigator instance. Without this key,
        // this branch and the OnboardingIntro one below are the *same*
        // component type at the *same* tree position — React reuses the
        // existing instance across a re-render instead of remounting it,
        // and React Navigation's `initialRouteName` prop only applies on a
        // navigator's first mount. So a session that goes from "has token,
        // dropped on OnboardingIntro, user has since navigated deeper" to
        // "token cleared" silently left the user stuck deep in the wizard —
        // same screen, now with no token, instead of actually bouncing to
        // Welcome. A distinct key per accessToken value forces the remount
        // React Navigation's own reset needs.
        <AuthNavigator key="anon" />
      ) : hasStore && isApproved && partnerSuspended ? (
        <PartnerSuspendedGate />
      ) : hasStore && isApproved ? (
        <AppNavigator />
      ) : applicationSubmitted ? (
        <WaitingApprovalGate />
      ) : (
        <AuthNavigator key={accessToken} initialRouteName="OnboardingIntro" />
      )}
    </NavigationContainer>
  );
}

// A NavigationContainer needs at least one navigator inside it — this
// wraps WaitingApprovalScreen in a bare single-screen stack rather than
// rendering it as a plain sibling, so the "exactly one navigator per
// container" rule (see App.tsx's own note) still holds even for the one
// state that has no tabs or chrome to navigate between.
const WaitingStack = createNativeStackNavigator();

// Same single-screen wrapper for an admin-suspended partner account.
function PartnerSuspendedGate() {
  return (
    <WaitingStack.Navigator screenOptions={{ headerShown: false }}>
      <WaitingStack.Screen name="PartnerSuspended" component={PartnerSuspendedScreen} />
    </WaitingStack.Navigator>
  );
}

function WaitingApprovalGate() {
  return (
    <WaitingStack.Navigator screenOptions={{ headerShown: false }}>
      <WaitingStack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
    </WaitingStack.Navigator>
  );
}
