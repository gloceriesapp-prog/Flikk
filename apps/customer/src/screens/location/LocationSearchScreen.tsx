// Manual fallback when location permission is denied (or the user opts out
// of GPS). Free-text search via the device's native geocoder — see
// src/location/geocoding.ts for why this isn't a live Places autocomplete.

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  geocodeAddress,
  getCurrentCoordinates,
  requestLocationPermission,
  reverseGeocode,
} from '../../location/geocoding';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationSearch'>;

export function LocationSearchScreen({ navigation }: Props) {
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
      navigation.replace('MapConfirm', { ...coords, addressLabel: query.trim() });
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
      const addressLabel = await reverseGeocode(coords);
      navigation.replace('MapConfirm', { ...coords, addressLabel });
    } catch {
      setError('Could not get your location. Please try searching instead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pb-safe pt-safe">
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-ink">Select delivery address</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-end justify-center">
          <Text className="text-xl text-ink">✕</Text>
        </Pressable>
      </View>

      <View className="mt-5 h-[52px] flex-row items-center rounded-full bg-mist px-4">
        <Text className="pr-2 text-base text-ink/50">🔍</Text>
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
          <Text className="text-lg text-lime-deep">◎</Text>
          <Text className="text-base font-semibold text-lime-deep">Use your current location</Text>
        </View>
        <Text className="text-ink/40">›</Text>
      </Pressable>

      {error && <Text className="mt-3 text-[13px] text-danger">{error}</Text>}
    </View>
  );
}
