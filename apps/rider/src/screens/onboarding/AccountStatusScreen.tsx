// Shown whenever a logged-in session isn't yet a usable rider account —
// two distinct real states, not one:
//
// 1. Not a rider at all (role !== 'rider', which by this point only ever
//    means role === 'customer' — an already-approved store_owner/admin
//    account is caught earlier, at OTP-verify time itself, by this app's
//    own utils/roleGuard.ts, so it never even reaches a real session
//    here). There is no self-serve "become a rider" flow anywhere in the
//    backend yet (api/auth.ts's own note): a phone number only ever
//    becomes role='rider' via a manual DB change. A phone that verifies
//    OTP successfully but was never granted that role would otherwise
//    403 forever on every real order call with no explanation — this
//    tells them plainly instead.
// 2. A real rider account, not yet admin-approved (is_approved === false)
//    — same shape as apps/partner's WaitingApprovalScreen, polling GET
//    /auth/me until admin's existing PATCH /admin/riders/pending/:userId
//    flips it.
//
// RootNavigator swaps to the real app shell automatically the instant
// both role==='rider' and isApproved flip true in useAuthStore — no
// explicit navigation call needed here.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircleIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchAccountStatus } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

const POLL_INTERVAL_MS = 10_000;

export function AccountStatusScreen() {
  const role = useAuthStore((s) => s.role);
  const applicationSubmitted = useAuthStore((s) => s.applicationSubmitted);
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus);
  const clear = useAuthStore((s) => s.clear);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setChecking(true);
      try {
        const { role: freshRole, is_approved, rider_application_submitted, is_rejected, rider_payout_configured, rejection_reason, rider_suspended, rider_suspended_reason } =
          await fetchAccountStatus();
        if (!cancelled) {
          setAccountStatus({
            role: freshRole,
            isApproved: is_approved,
            applicationSubmitted: rider_application_submitted,
            isRejected: is_rejected,
            payoutConfigured: rider_payout_configured,
            rejectionReason: rejection_reason,
            isSuspended: rider_suspended === true,
            suspendedReason: rider_suspended_reason ?? null,
          });
        }
      } catch {
        // Silent — a failed poll just tries again next interval.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setAccountStatus]);

  // A submitted applicant is still role='customer' until a founder approves
  // (migrations/042_rider_onboarding.sql) — so role alone can't mean "not a
  // rider" here. Only show the not-registered message when there's genuinely
  // no application on file; a real pending applicant always sees "under
  // review". RootNavigator only ever mounts this screen for a submitted,
  // not-yet-approved, not-rejected session anyway.
  if (!applicationSubmitted && role !== null && role !== 'rider') {
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
        <StatusBar style="dark" />
        <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/10">
          <AppIcon icon={AlertCircleIcon} size={32} color={colors.danger} />
        </View>
        <View className="items-center gap-2">
          <Text className="text-center text-xl font-bold text-ink">This number isn&apos;t registered as a rider</Text>
          <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
            Contact Gloceries ops to get this phone number set up as a rider account, then come back and log in again.
          </Text>
        </View>
        <Pressable onPress={() => void clear()} className="rounded-full bg-ink px-6 py-3.5">
          <Text className="text-sm font-semibold text-white">Log out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
      <StatusBar style="dark" />
      <View className="h-20 w-20 items-center justify-center rounded-full bg-gold/15">
        <AppIcon icon={Clock01Icon} size={32} color={colors.gold} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink">Account under review</Text>
        <Text className="max-w-[280px] text-center text-sm font-medium text-ink/60">
          Our team is verifying your rider account. We&apos;ll get you into the app the moment you&apos;re approved, no need to check back.
        </Text>
      </View>
      <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <View className="h-2 w-2 rounded-full bg-gold" />}
        <Text className="text-xs font-semibold text-ink/60">{checking ? 'Checking status…' : 'Waiting for approval'}</Text>
      </View>
    </View>
  );
}
