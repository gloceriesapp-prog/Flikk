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
  searchPlaces,
  type Coordinates,
} from '../../location/geocoding';
import { useRecentSearchesStore } from '../../store/useRecentSearchesStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SelectLocation'>;

const BUTTON_ACCENT = '#1447e6';
// Same page background CartScreen.tsx uses — per an explicit ask to match.
const PAGE_BG = '#F1F2F4';
// Below this, Mappls Autosuggest (searchPlaces) returns mostly noise —
// matches LocationSearchScreen's own convention for when to start querying.
const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 350;

export function SelectLocationScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  // Live suggestions as the user types (searchPlaces -> Mappls Autosuggest,
  // backend/src/routes/location.ts's own proxy) — previously this search
  // bar only fired on submit, so a user who never hit enter saw literally
  // nothing happen while typing, and a query with no matches showed no
  // feedback either. suggestLoading/suggestions/hasSearched together drive
  // three real states: loading, real results, and a genuine "no results"
  // message — not just an empty list that looks broken.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [resolvingSuggestion, setResolvingSuggestion] = useState<string | null>(null);
  const recentSearches = useRecentSearchesStore((s) => s.entries);
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  const trimmedQuery = query.trim();
  const isSearchingMode = trimmedQuery.length >= MIN_QUERY_LENGTH;

  // Best-effort, once — purely to power the "Xkm away" line on each row
  // below, same as LocationSearchScreen's own identical fetch. Never blocks
  // anything if it fails (permission denied, GPS off): rows just render
  // without a distance badge instead.
  useEffect(() => {
    getCurrentCoordinates()
      .then(setCurrentCoords)
      .catch(() => {});
  }, []);

  // Debounced live search — waits for typing to pause before hitting the
  // backend, same reasoning HomeSearchBar-style inputs elsewhere in this
  // app use: firing on every keystroke would spam the Mappls proxy for no
  // benefit, since the in-flight request for "Ka" is thrown away the
  // instant "Kau" fires anyway.
  useEffect(() => {
    let cancelled = false;

    if (!isSearchingMode) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setSuggestLoading(true);
    });
    const timer = setTimeout(() => {
      searchPlaces(trimmedQuery).then((labels) => {
        if (!cancelled) {
          setSuggestions(labels);
          setSuggestLoading(false);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, isSearchingMode]);

  function distanceLabel(coords: Coordinates | null) {
    if (!currentCoords || !coords) return null;
    return formatDistance(distanceKm(currentCoords, coords));
  }

  async function handleSearchSubmit() {
    if (!trimmedQuery || searching) return;
    setSearching(true);
    try {
      const coords = await geocodeAddress(trimmedQuery);
      if (!coords) return;
      navigation.navigate('LocationSearch', { ...coords, addressLabel: trimmedQuery });
    } finally {
      setSearching(false);
    }
  }

  // A tapped suggestion is just a text label (Mappls Autosuggest's own
  // free-tier limitation, searchPlaces' own note) — still has to resolve to
  // real coordinates via geocodeAddress before the map screen can pin it,
  // same call handleSearchSubmit above makes for a manually typed address.
  async function handleSelectSuggestion(label: string) {
    if (resolvingSuggestion) return;
    setResolvingSuggestion(label);
    try {
      const coords = await geocodeAddress(label);
      if (!coords) return;
      navigation.navigate('LocationSearch', { ...coords, addressLabel: label });
    } finally {
      setResolvingSuggestion(null);
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
    <View className="flex-1 pt-safe" style={{ backgroundColor: PAGE_BG }}>
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 px-5 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-[18.5px] font-semibold text-ink">Select your location</Text>
      </View>

      <View className="px-5 pb-4 pt-1">
        <View className="h-[52px] flex-row items-center rounded-[12px] bg-white px-4">
          <AppIcon icon={Search01Icon} size={18} color={`${colors.ink}66`} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholder="Search an area or address"
            placeholderTextColor="#9AA5A3"
            className="ml-2.5 h-full flex-1 py-0 text-[15px] text-ink font-medium"
          />
          {searching || suggestLoading ? <ActivityIndicator size="small" color={colors.ink} /> : null}
        </View>
      </View>

      {isSearchingMode ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-10" keyboardShouldPersistTaps="handled">
          {suggestLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : suggestions.length > 0 ? (
            <View className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-black/5">
              {suggestions.map((label, i) => (
                <Pressable
                  key={label}
                  onPress={() => handleSelectSuggestion(label)}
                  disabled={resolvingSuggestion !== null}
                  className={`flex-row items-center gap-3 p-4 ${i < suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                    <AppIcon icon={Search01Icon} size={16} color={colors.ink} />
                  </View>
                  <Text className="flex-1 text-[15px] font-semibold text-ink" numberOfLines={2}>
                    {label}
                  </Text>
                  {resolvingSuggestion === label ? <ActivityIndicator size="small" color={colors.ink} /> : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="items-center gap-1.5 rounded-3xl bg-white px-6 py-12 shadow-sm shadow-black/5">
              <Text className="text-[15px] font-bold text-ink">No results found</Text>
              <Text className="text-center text-[13px] text-ink/50">
                Try a different spelling, or search a nearby landmark instead.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
      <ScrollView className="flex-1" contentContainerClassName="gap-7 px-5 pb-10">
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={locating}
          className="h-14 w-full flex-row items-center justify-center gap-2 rounded-[12px] bg-white"
        >
          {locating ? (
            <ActivityIndicator size="small" color={BUTTON_ACCENT} />
          ) : (
            <AppIcon icon={GpsSignal01Icon} size={17} color={BUTTON_ACCENT} />
          )}
          <Text className="text-[14px] font-semibold" style={{ color: BUTTON_ACCENT }} numberOfLines={1}>
            Use your Current Location
          </Text>
        </Pressable>

        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-[12px] font-semibold tracking-wider text-ink/35">SAVED ADDRESSES</Text>
            <Pressable
              onPress={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <AppIcon icon={Add01Icon} size={13} color={BUTTON_ACCENT} />
              <Text className="text-[12px] font-semibold" style={{ color: BUTTON_ACCENT }}>
                ADD NEW ADDRESS
              </Text>
            </Pressable>
          </View>

          {addressesLoading ? (
            <ActivityIndicator color={colors.ink} />
          ) : addresses && addresses.length > 0 ? (
            <View className="overflow-hidden rounded-3xl bg-white">
              {addresses.map((address, i) => {
                const coords =
                  address.latitude != null && address.longitude != null
                    ? { latitude: address.latitude, longitude: address.longitude }
                    : null;
                const distance = distanceLabel(coords);
                return (
                  <Pressable
                    key={address.id}
                    onPress={() =>
                      navigation.navigate('LocationSearch', {
                        ...(coords ?? {}),
                        addressLabel: address.line1,
                      })
                    }
                    className={`flex-row items-start gap-3 p-4 ${i < addresses.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                      <AppIcon icon={Location01Icon} size={18} color={colors.ink} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-1 text-[15px] font-bold text-ink" numberOfLines={1}>
                          {address.label}
                        </Text>
                        {distance ? <Text className="text-[12px] font-medium text-ink/40">{distance}</Text> : null}
                      </View>
                      <Text className="mt-0.5 text-[13px] leading-[18px] text-ink/50" numberOfLines={2}>
                        {address.line1}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {recentSearches.length > 0 ? (
          <View className="gap-3">
            <Text className="px-1 text-[12px] font-bold tracking-wider text-ink/35">RECENTLY SEARCHED</Text>
            <View className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-black/5">
              {recentSearches.map((entry, i) => {
                // entry.label is the one real string this store keeps (its
                // own note: written straight from whatever resolved the
                // search) — split on the first comma to get a short title
                // + fuller subtitle, same real text, just parsed for
                // display, not a fabricated second field.
                const [title, ...rest] = entry.label.split(',');
                const subtitle = rest.join(',').trim();
                const distance = distanceLabel(entry);
                return (
                  <Pressable
                    key={entry.label}
                    onPress={() => navigation.navigate('LocationSearch', { ...entry, addressLabel: entry.label })}
                    className={`flex-row items-start gap-3 p-4 ${i < recentSearches.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                      <AppIcon icon={Clock01Icon} size={18} color={colors.ink} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-1 text-[15px] font-bold text-ink" numberOfLines={1}>
                          {title.trim()}
                        </Text>
                        {distance ? <Text className="text-[12px] font-medium text-ink/40">{distance}</Text> : null}
                      </View>
                      {subtitle ? (
                        <Text className="mt-0.5 text-[13px] leading-[18px] text-ink/50" numberOfLines={2}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
      )}
    </View>
  );
}
