// Manual fallback when location permission is denied (or the user opts out
// of GPS). Free-text search via the device's native geocoder — see
// src/location/geocoding.ts for why this isn't a live Places autocomplete.

import { ArrowRight01Icon, Cancel01Icon, GpsSignal01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import {
  geocodeAddress,
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocode,
} from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationSearch'>;

export function LocationSearchScreen({ navigation, route }: Props) {
  const intent = route.params?.intent;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const coords = await geocodeAddress(query.trim());
      if (!coords) {
        setError("Couldn't find that location. Try a different search.");
        return;
      }
      // Typed text stays the address label (that's what the user actually
      // searched for), but city still needs to come from the geocoder —
      // free text alone doesn't reliably carry a clean city name.
      const { city } = await reverseGeocode(coords);
      navigation.replace('MapConfirm', { ...coords, addressLabel: query.trim(), city, intent });
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUseCurrentLocation() {
    setError(null);
    setLoading(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Location access is off. Enable it in Settings, or keep searching above.');
        return;
      }
      const coords = await getCurrentCoordinates();
      const { addressLabel, city } = await reverseGeocode(coords);
      navigation.replace('MapConfirm', { ...coords, addressLabel, city, intent });
    } catch {
      setError('Could not get your location. Please try searching instead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DismissKeyboardView>
      <View className="flex-1 bg-white px-6 pb-safe pt-safe">
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-ink">Select delivery address</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-end justify-center">
            <AppIcon icon={Cancel01Icon} size={20} color={colors.ink} />
          </Pressable>
        </View>

        <View className="mt-5 h-[52px] flex-row items-center rounded-full bg-mist px-4">
          <View className="pr-2">
            <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="Search for area, street name..."
            placeholderTextColor="#9AA5A3"
            textAlignVertical="center"
            className="h-full flex-1 py-0 text-base leading-tight text-ink"
          />
        </View>

        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={loading}
          className="mt-3 flex-row items-center justify-between rounded-2xl bg-mist px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <AppIcon icon={GpsSignal01Icon} size={18} color={colors.limeDeep} />
            <Text className="text-base font-semibold text-lime-deep">Use your current location</Text>
          </View>
          <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} />
        </Pressable>

        {error && <Text className="mt-3 text-[13px] text-danger">{error}</Text>}
      </View>
    </DismissKeyboardView>
  );
}
