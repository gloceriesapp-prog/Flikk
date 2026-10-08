// Shown instead of the app shell while Gloceries has suspended this partner
// account (users.partner_suspended, migration 114 — GET /auth/me
// partner_suspended). The backend already refuses every partner route with
// 403 PARTNER_SUSPENDED and keeps the store closed; this screen tells the
// owner why, and polls /auth/me so a reinstatement drops them straight back
// into the app.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { checkAccountStatus } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

const POLL_INTERVAL_MS = 30_000;

export function PartnerSuspendedScreen() {
  const reason = useAuthStore((s) => s.partnerSuspendedReason);
  const setPartnerSuspension = useAuthStore((s) => s.setPartnerSuspension);
  const clear = useAuthStore((s) => s.clear);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      setChecking(true);
      try {
        const status = await checkAccountStatus();
        if (!cancelled) setPartnerSuspension(status.partner_suspended === true, status.partner_suspended_reason ?? null);
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
  }, [setPartnerSuspension]);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-8 pb-safe pt-safe">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/10">
        <AppIcon icon={AlertCircleIcon} size={32} color={colors.danger} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink">Partner account suspended</Text>
        <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
          {reason ?? 'Your partner account has been suspended by Gloceries.'}
        </Text>
        <Text className="max-w-[300px] text-center text-sm font-medium text-ink/60">
          Your store is closed and you can&apos;t take orders until Gloceries reinstates your account. Contact Gloceries support.
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
