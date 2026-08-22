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
import { CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { checkAccountStatus } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

const POLL_INTERVAL_MS = 10_000;

export function WaitingApprovalScreen() {
  const setApproved = useAuthStore((s) => s.setApproved);
  const clearSession = useAuthStore((s) => s.clear);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setChecking(true);
      try {
        const { is_approved } = await checkAccountStatus();
        // RootNavigator swaps to the app shell automatically the instant
        // this flips true — no explicit navigation call needed here.
        if (!cancelled && is_approved) setApproved(true);
      } catch {
        // Silent — a failed poll just tries again next interval. Nothing
        // useful to show the owner for "the recheck itself didn't work,"
        // that would just read as their application having a problem
        // when it doesn't.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    void poll(); // check once immediately, don't wait a full interval first

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setApproved]);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-gold/15">
        <AppIcon icon={Clock01Icon} size={32} color={colors.gold} />
      </View>

      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink">Application under review</Text>
        <Text className="max-w-[280px] text-center text-sm font-medium text-ink/60">
          Our team typically reviews new stores within <Text className="font-bold text-ink">24 hours</Text>. We&apos;ll
          notify you right here in the app the moment your store is approved — no need to check back.
        </Text>
      </View>

      <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <View className="h-2 w-2 rounded-full bg-gold" />}
        <Text className="text-xs font-semibold text-ink/60">{checking ? 'Checking status…' : 'Waiting for approval'}</Text>
      </View>

      <View className="mt-4 flex-row items-center gap-1.5">
        <AppIcon icon={CheckmarkCircle02Icon} size={13} color={`${colors.ink}50`} />
        <Text className="text-xs font-medium text-ink/40">Your application was received</Text>
      </View>

      <Pressable onPress={() => void clearSession()} hitSlop={8} className="mt-8">
        <Text className="text-xs font-semibold text-ink/40">Log out</Text>
      </Pressable>
    </View>
  );
}
