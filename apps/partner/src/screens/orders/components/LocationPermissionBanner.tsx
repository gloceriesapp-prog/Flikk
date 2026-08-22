// The consent UI for useLiveDistrict — a slim card under the header, not a
// blocking modal. idle: offers to fetch a live city; requesting: shows
// progress; denied/error: says so and offers a retry, dismissible (X) so
// a shop owner who doesn't want to grant it isn't nagged every time they
// open the app. Renders nothing once status is 'granted' — the header's
// district line already speaks for itself at that point.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Cancel01Icon, GpsSignal01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { LiveDistrictStatus } from '../../../location/useLiveDistrict';

interface Props {
  status: LiveDistrictStatus;
  onRequest: () => void;
}

export function LocationPermissionBanner({ status, onRequest }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (status === 'granted' || dismissed) return null;

  return (
    <View className="mx-5 mb-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-soft">
        {status === 'requesting' ? (
          <ActivityIndicator size="small" color={colors.limeDeep} />
        ) : (
          <AppIcon icon={GpsSignal01Icon} size={16} color={colors.limeDeep} />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink">
          {status === 'requesting' && 'Getting your location…'}
          {status === 'idle' && 'Set your city automatically'}
          {status === 'denied' && "Location access denied — we're showing a default city"}
          {status === 'error' && "Couldn't get your location"}
        </Text>
        {status !== 'requesting' && (
          <Pressable onPress={onRequest} hitSlop={6}>
            <Text className="mt-0.5 text-xs font-bold text-lime-deep">
              {status === 'idle' ? 'Use current location' : 'Try again'}
            </Text>
          </Pressable>
        )}
      </View>

      {status !== 'requesting' && (
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-full"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <AppIcon icon={Cancel01Icon} size={14} color={`${colors.ink}50`} />
        </Pressable>
      )}
    </View>
  );
}
