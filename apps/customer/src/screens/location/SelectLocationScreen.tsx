// Reached from Home's own "Delivering to" header tap — per an explicit
// ask/reference, that tap used to skip straight to LocationSearchScreen's
// live map with no way to reuse a saved address or a past search. This is
// the missing intermediate picker: search, "use current location", "add
// new address", saved addresses, recently searched. Every row here still
// ends at LocationSearchScreen (the real map+confirm flow) — this screen
// only decides what it opens pre-filled with, matching the explicit ask
// that a picked address should show up pinned on the map, not just
// silently apply.

import { useEffect, useState } from 'react';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Clock01Icon,
  GpsSignal01Icon,
  Location01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { fetchAddresses } from '../../api/addresses';
import {
  distanceKm,
  formatDistance,
  geocodeAddress,
  getCurrentCoordinates,
  reverseGeocode,
  type Coordinates,
} from '../../location/geocoding';
import { useRecentSearchesStore } from '../../store/useRecentSearchesStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SelectLocation'>;

const BUTTON_ACCENT = '#1447e6';

export function SelectLocationScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const recentSearches = useRecentSearchesStore((s) => s.entries);
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  // Best-effort, once — purely to power the "Xkm away" line on each row
  // below, same as LocationSearchScreen's own identical fetch. Never blocks
  // anything if it fails (permission denied, GPS off): rows just render
  // without a distance badge instead.
  useEffect(() => {
    getCurrentCoordinates()
      .then(setCurrentCoords)
      .catch(() => {});
  }, []);

  function distanceLabel(coords: Coordinates | null) {
    if (!currentCoords || !coords) return null;
    return formatDistance(distanceKm(currentCoords, coords));
  }

  async function handleSearchSubmit() {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      const coords = await geocodeAddress(trimmed);
      if (!coords) return;
      navigation.navigate('LocationSearch', { ...coords, addressLabel: trimmed });
    } finally {
      setSearching(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (locating) return;
    setLocating(true);
    try {
      const coords = currentCoords ?? (await getCurrentCoordinates());
      const { addressLabel, city } = await reverseGeocode(coords);
      navigation.navigate('LocationSearch', { ...coords, addressLabel, city });
    } catch {
      navigation.navigate('LocationSearch');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100 pt-safe">
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 px-5 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-lg font-bold text-ink">Select your location</Text>
      </View>

      <View className="px-5 pb-3">
        <View className="h-12 flex-row items-center rounded-full border border-gray-300 bg-white px-4">
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholder="Search an area or address"
            placeholderTextColor="#9AA5A3"
            className="h-full flex-1 py-0 text-base text-ink"
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-8">
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={locating}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-3"
          >
            {locating ? (
              <ActivityIndicator size="small" color={BUTTON_ACCENT} />
            ) : (
              <AppIcon icon={GpsSignal01Icon} size={17} color={BUTTON_ACCENT} />
            )}
            <Text className="text-[13.5px] font-semibold" style={{ color: BUTTON_ACCENT }} numberOfLines={1}>
              Use Current Location
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-3"
          >
            <AppIcon icon={Add01Icon} size={17} color={BUTTON_ACCENT} />
            <Text className="text-[13.5px] font-semibold" style={{ color: BUTTON_ACCENT }} numberOfLines={1}>
              Add New Address
            </Text>
          </Pressable>
        </View>

        {addressesLoading ? (
          <ActivityIndicator color={colors.ink} />
        ) : addresses && addresses.length > 0 ? (
          <View className="gap-3">
            <Text className="text-xs font-bold tracking-wide text-ink/40">SAVED ADDRESSES</Text>
            {addresses.map((address) => {
              const coords = address.latitude != null && address.longitude != null
                ? { latitude: address.latitude, longitude: address.longitude }
                : null;
              return (
                <Pressable
                  key={address.id}
                  onPress={() =>
                    navigation.navigate('LocationSearch', {
                      ...(coords ?? {}),
                      addressLabel: address.line1,
                    })
                  }
                  className="flex-row items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-black/5"
                >
                  <View className="h-14 w-14 items-center justify-center gap-0.5 rounded-2xl bg-gray-100">
                    <AppIcon icon={Location01Icon} size={18} color={colors.ink} />
                    {distanceLabel(coords) ? (
                      <Text className="text-[10px] font-semibold text-ink/50">{distanceLabel(coords)}</Text>
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
                      {address.label}
                    </Text>
                    <Text className="text-[13px] text-ink/55" numberOfLines={2}>
                      {address.line1}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {recentSearches.length > 0 ? (
          <View className="gap-3">
            <Text className="text-xs font-bold tracking-wide text-ink/40">RECENTLY SEARCHED</Text>
            {recentSearches.map((entry) => (
              <Pressable
                key={entry.label}
                onPress={() => navigation.navigate('LocationSearch', { ...entry, addressLabel: entry.label })}
                className="flex-row items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-black/5"
              >
                <View className="h-14 w-14 items-center justify-center gap-0.5 rounded-2xl bg-gray-100">
                  <AppIcon icon={Clock01Icon} size={18} color={colors.ink} />
                  {distanceLabel(entry) ? (
                    <Text className="text-[10px] font-semibold text-ink/50">{distanceLabel(entry)}</Text>
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-ink" numberOfLines={2}>
                    {entry.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
