// Step 3 of 3 — read-only summary of everything StoreSetupScreen and
// StoreDetailsScreen collected, plus the actual submit. No field entry
// here on purpose: a shop owner reviewing what they're about to send for
// approval shouldn't be able to silently fat-finger a value on this
// screen — going back to the right step (via "Edit") is the only way to
// change something.

import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight01Icon, Location01Icon, StoreLocation01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitStoreApplication } from '../../api/auth';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreReview'>;

export function StoreReviewScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Not setHasStore — submitting no longer creates a real `stores` row
  // (backend's storeOnboarding.ts's own note), only admin's approve action
  // does. This is the "submitted, waiting on a decision" flag instead;
  // RootNavigator routes to WaitingApprovalScreen off it, not off hasStore.
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const clearSession = useAuthStore((s) => s.clear);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await submitStoreApplication({
        storeName: draft.storeName,
        category: draft.category,
        district: draft.district ?? 'Udupi',
        gstNumber: draft.gstNumber || undefined,
        photoUrl: draft.photoUrl || undefined,
      });
      setApplicationSubmitted(true);
    } catch (err) {
      // A 401 here means the stored session token is stale or invalid —
      // e.g. a dev-mode token from before a real backend existed, now
      // being sent to a real one that never issued it. Retrying the same
      // submit would just 401 again forever; the only real fix is signing
      // in again, so clear the bad session and let RootNavigator drop the
      // owner back to Login on its own once accessToken goes null — not a
      // dead-end red error text with no way forward.
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Taking you back to log in…');
        setTimeout(() => {
          void clearSession();
        }, 1500);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="px-6 pt-4">
        <Text className="text-xs font-bold uppercase tracking-wide text-lime-deep">Step 3 of 3</Text>
        <Text className="mt-1 text-3xl font-medium text-ink">Review & submit</Text>
        <Text className="mt-1 text-base font-medium text-ink/60">
          Double-check everything — we’ll review this before your store goes live.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pt-6">
        {draft.photoUrl && (
          <Image source={{ uri: draft.photoUrl }} className="h-40 w-full rounded-2xl" resizeMode="cover" />
        )}

        <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <Row
            icon={StoreLocation01Icon}
            label="Store"
            value={draft.storeName}
            onEdit={() => navigation.navigate('StoreSetup')}
          />
          <View className="h-px bg-gray-100" />
          <Row
            icon={StoreLocation01Icon}
            label="Category"
            value={draft.category}
            onEdit={() => navigation.navigate('StoreSetup')}
          />
          <View className="h-px bg-gray-100" />
          <Row
            icon={Location01Icon}
            label="Location"
            value={draft.district ?? 'Not set'}
            onEdit={() => navigation.navigate('StoreDetails', { draft })}
          />
          {draft.gstNumber.length > 0 && (
            <>
              <View className="h-px bg-gray-100" />
              <Row
                icon={StoreLocation01Icon}
                label="GST number"
                value={draft.gstNumber}
                onEdit={() => navigation.navigate('StoreDetails', { draft })}
              />
            </>
          )}
        </View>

        {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton label="Submit for review" onPress={handleSubmit} loading={loading} trailingIcon={ArrowRight01Icon} />
      </View>
    </View>
  );
}

interface RowProps {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  label: string;
  value: string;
  onEdit: () => void;
}

function Row({ icon, label, value, onEdit }: RowProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-soft">
        <AppIcon icon={icon} size={16} color={colors.limeDeep} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-medium text-ink/50">{label}</Text>
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text className="text-xs font-bold text-lime-deep">Edit</Text>
      </Pressable>
    </View>
  );
}
