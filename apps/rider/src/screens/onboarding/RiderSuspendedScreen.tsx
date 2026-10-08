// Shown instead of the app shell while an admin has suspended this rider
// (riders.is_active=false — GET /auth/me rider_suspended). The backend
// already refuses to put a suspended rider online and the dispatch RPCs skip
// them; this screen tells the rider why. It takes the rider offline locally,
// then polls /auth/me so a reactivation drops them straight back into the app.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchAccountStatus } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';

const POLL_INTERVAL_MS = 30_000;

export function RiderSuspendedScreen() {
  const reason = useAuthStore((s) => s.suspendedReason);
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus);
  const clear = useAuthStore((s) => s.clear);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (useRiderOrdersStore.getState().isOnline) useRiderOrdersStore.getState().goOffline();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      setChecking(true);
      try {
        const status = await fetchAccountStatus();
        if (!cancelled) {
          setAccountStatus({
            role: status.role,
            isApproved: status.is_approved,
            applicationSubmitted: status.rider_application_submitted,
            isRejected: status.is_rejected,
            payoutConfigured: status.rider_payout_configured,
            rejectionReason: status.rejection_reason,
            isSuspended: status.rider_suspended === true,
            suspendedReason: status.rider_suspended_reason ?? null,
          });
        }
      } catch {
        // A failed poll just tries again next interval.
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

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
      <StatusBar style="dark" />
      <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/10">
        <AppIcon icon={AlertCircleIcon} size={32} color={colors.danger} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink">Account suspended</Text>
        <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
          {reason ?? 'Your rider account has been suspended by Gloceries.'}
        </Text>
        <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
          You can&apos;t go online or receive deliveries until Gloceries ops reactivates your account.
        </Text>
      </View>
      <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <View className="h-2 w-2 rounded-full bg-danger" />}
        <Text className="text-xs font-semibold text-ink/60">{checking ? 'Checking status…' : 'Suspended'}</Text>
      </View>
      <Pressable onPress={() => void clear()} className="rounded-full bg-ink px-6 py-3.5">
        <Text className="text-sm font-semibold text-white">Log out</Text>
      </Pressable>
    </View>
  );
}
