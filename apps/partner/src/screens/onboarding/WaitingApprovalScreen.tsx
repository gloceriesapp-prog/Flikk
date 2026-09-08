// Standalone screen per specs/00-foundation/auth-and-roles.md's "Approval
// gating" section: "unapproved store owner sees a waiting for approval
// screen, not the real app shell — no catalog, no order queue, nothing."
// Deliberately not a locked-down version of the tab layout — no
// BottomNavBar, no navigator chrome, just this.
//
// Polls GET /auth/me every POLL_INTERVAL_MS while mounted — the practical
// stand-in for a real Supabase Realtime subscription on the user's own
// row (specs/04-admin-dashboard/flows.md's onboarding flow: "approved:
// users.is_approved = true → partner app unlocks"). A subscription would
// push the change instantly instead of waiting up to one poll interval;
// polling is the simpler thing that's actually buildable client-side
// right now and still gets a store owner into the app within a few
// seconds of being approved, without them having to force-quit and
// reopen to find out.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertCircleIcon, ArrowRight01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { checkAccountStatus } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

const POLL_INTERVAL_MS = 10_000;

export function WaitingApprovalScreen() {
  const setApproved = useAuthStore((s) => s.setApproved);
  const setHasStore = useAuthStore((s) => s.setHasStore);
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const setRejection = useAuthStore((s) => s.setRejection);
  const isRejected = useAuthStore((s) => s.isRejected);
  const rejectionReason = useAuthStore((s) => s.rejectionReason);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setChecking(true);
      try {
        const { is_approved, has_store, is_rejected, rejection_reason } = await checkAccountStatus();
        // RootNavigator swaps to the app shell automatically the instant
        // both flip true — no explicit navigation call needed here. Both,
        // not just is_approved: a real `stores` row (has_store) only gets
        // created at the same moment admin approves now (backend's
        // storeOnboarding.ts's own note), so this screen's unlock
        // condition needs both flags to actually match what just happened.
        if (!cancelled && is_approved && has_store) {
          setApproved(true);
          setHasStore(true);
        }
        if (!cancelled) setRejection(!!is_rejected, rejection_reason ?? null);
      } catch {
        // Silent — a failed poll just tries again next interval. Nothing
        // useful to show the owner for "the recheck itself didn't work,"
        // that would just read as their application having a problem
        // when it doesn't.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    // Rejected: stop polling — nothing left to wait on until the owner
    // actually resubmits (handleResubmit below), which itself drops this
    // screen entirely.
    if (isRejected) return;

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    void poll(); // check once immediately, don't wait a full interval first

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRejected, setApproved, setHasStore, setRejection]);

  // Drops RootNavigator back into the wizard at StoreSetup — the kept
  // draft (admin's reject route never deletes it, only approve does)
  // means StoreSetupScreen's own resume-draft fetch pre-fills everything
  // the owner already entered, so this is "edit and resubmit," not
  // "start over." applicationSubmitted flips false locally only; the
  // real submitted_at on the server doesn't change until POST
  // /store-application actually resubmits.
  function handleResubmit() {
    setApplicationSubmitted(false);
  }

  if (isRejected) {
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/10">
          <AppIcon icon={AlertCircleIcon} size={32} color={colors.danger} />
        </View>

        <View className="items-center gap-2">
          <Text className="text-center text-xl font-bold text-ink">We couldn&apos;t approve your application</Text>
          <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
            {rejectionReason ?? "We couldn't verify your store documents this time. Please review your details and resubmit."}
          </Text>
        </View>

        <Pressable
          onPress={handleResubmit}
          className="flex-row items-center gap-1.5 rounded-full bg-ink px-6 py-3.5"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-sm font-semibold text-white">Edit & resubmit</Text>
          <AppIcon icon={ArrowRight01Icon} size={15} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-gold/15">
        <AppIcon icon={Clock01Icon} size={32} color={colors.gold} />
      </View>

      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink">Application under review</Text>
        <Text className="max-w-[280px] text-center text-sm font-medium text-ink/60">
          We received your application, Our team typically reviews new stores within <Text className="font-bold text-ink">2 - 3 hours</Text>. We&apos;ll
          notify you right here in the app the moment your store is approved, no need to check back.
        </Text>
      </View>

      <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <View className="h-2 w-2 rounded-full bg-gold" />}
        <Text className="text-xs font-semibold text-ink/60">{checking ? 'Checking status…' : 'Waiting for approval'}</Text>
      </View>

    </View>
  );
}
