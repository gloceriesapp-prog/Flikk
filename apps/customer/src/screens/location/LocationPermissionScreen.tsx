// Soft-ask screen shown once, right after login, before the OS permission
// dialog fires. Priming the user with our own copy first (rather than firing
// the native prompt cold) measurably reduces hard-denial rates — standard
// practice, not decoration.
//
// Allow  -> capture GPS position -> MapConfirmScreen (pre-filled, user still
//           confirms the exact pin before it's saved)
// Deny   -> LocationSearchScreen (manual search, per the reference flow)

import { Location01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocode } from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationPermission'>;

export function LocationPermissionScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAllow() {
    setError(null);
    setLoading(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        navigation.replace('LocationSearch');
        return;
      }
      const coords = await getCurrentCoordinates();
      const addressLabel = await reverseGeocode(coords);
      navigation.replace('MapConfirm', { ...coords, addressLabel });
    } catch {
      setError('Could not get your location. You can search for it instead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-between bg-mist px-6 pb-safe pt-safe">
      <View className="flex-1 items-center justify-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-lime-soft">
          <AppIcon icon={Location01Icon} size={36} color={colors.limeDeep} />
        </View>
        <Text className="text-center text-2xl font-extrabold text-ink">Enable your location</Text>
        <Text className="text-center text-[15px] leading-5 text-ink/65">
          We use your location to show stores near you and get your order delivered as fast as
          possible.
        </Text>
        {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}
      </View>

      <View className="gap-3 pb-4">
        <PrimaryButton label="Allow Location Access" onPress={handleAllow} loading={loading} />
        <Text
          onPress={() => navigation.replace('LocationSearch')}
          className="py-2 text-center text-sm font-semibold text-ink/70"
        >
          Enter address manually
        </Text>
      </View>
    </View>
  );
}
