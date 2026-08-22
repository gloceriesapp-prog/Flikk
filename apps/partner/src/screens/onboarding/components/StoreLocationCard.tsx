// "Location" section on Store Setup — shows "Enable location" until a
// place is picked, then the picked location's name. Tapping either opens a
// compact, content-sized dialog box floating just under the status bar
// (rounded on every corner, dimmed backdrop) — not a top-to-bottom sheet.
// The search bar is live: typed queries resolve to real place suggestions
// via the device's own geocoder (see searchPlaces in
// ../../../location/geocoding.ts — no Places API key needed or budgeted),
// shown inside the same box which grows to fit them, capped by an internal
// scroll past a handful of results. Picking a suggestion or "Use your
// current location" both hand off to LocationPinScreen's draggable-pin
// confirm step, seeded with that suggestion's coordinates or the device's
// live position respectively — that screen still owns the actual
// permission/map/geocode work.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight01Icon,
  Cancel01Icon,
  GpsSignal01Icon,
  Location01Icon,
  Location04Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { searchPlaces, type Coordinates, type PlaceSuggestion } from '../../../location/geocoding';
import { colors } from '../../../theme/tokens';

interface Props {
  district: string | null;
  onUseCurrentLocation: () => void;
  onSelectPlace: (coordinates: Coordinates) => void;
}

const SHEET_OFFSCREEN_Y = -420;
const SEARCH_DEBOUNCE_MS = 150;

export function StoreLocationCard({ district, onUseCurrentLocation, onSelectPlace }: Props) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const insets = useSafeAreaInsets();
  const [sheetY] = useState(() => new Animated.Value(SHEET_OFFSCREEN_Y));

  useEffect(() => {
    if (!dialogVisible) return;
    sheetY.setValue(SHEET_OFFSCREEN_Y);
    Animated.timing(sheetY, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }, [dialogVisible, sheetY]);

  useEffect(() => {
    const empty = query.trim().length === 0;
    const timeout = setTimeout(async () => {
      if (empty) {
        setSuggestions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchPlaces(query);
      setSuggestions(results);
      setSearching(false);
    }, empty ? 0 : SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  function closeDialog(after?: () => void) {
    Animated.timing(sheetY, { toValue: SHEET_OFFSCREEN_Y, duration: 200, useNativeDriver: true }).start(() => {
      setDialogVisible(false);
      setQuery('');
      setSuggestions([]);
      after?.();
    });
  }

  function openDialog() {
    setDialogVisible(true);
  }

  return (
    <>
      {district ? (
        <Pressable
          onPress={openDialog}
          className="flex-row items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-lime-soft">
            <AppIcon icon={Location01Icon} size={15} color={colors.limeDeep} />
          </View>
          <Text className="flex-1 text-base font-medium text-ink">{district}</Text>
          <Text className="text-xs font-semibold text-ink/50">Change</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={openDialog}
          className="items-center justify-center rounded-2xl border border-gray-200 bg-white py-5"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-base font-medium text-ink bg-[#F9FAFB]">Enable location</Text>
        </Pressable>
      )}

      <Modal visible={dialogVisible} transparent animationType="fade" onRequestClose={() => closeDialog()}>
        <Pressable className="flex-1 bg-black/50" onPress={() => closeDialog()}>
          <Animated.View
            style={{ transform: [{ translateY: sheetY }], marginTop: insets.top + 12 }}
            className="mx-4 shadow-2xl"
          >
            <BlurView
              intensity={70}
              tint="light"
              style={{
                minHeight: 520,
                borderRadius: 28,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.55)',
              }}
            >
              {/* Semi-transparent white wash over the blur so text stays legible —
                  a bare BlurView alone lets whatever's behind it (the dimmed page)
                  bleed through too strongly for body text at this size. */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} className="flex-1">
                {/* Swallow taps so they don't bubble to the backdrop Pressable behind this sheet. */}
                <Pressable className="px-5 py-6" onPress={(e) => e.stopPropagation()}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-medium text-ink">Select store location</Text>
                    <Pressable
                      onPress={() => closeDialog()}
                      hitSlop={10}
                      className="h-9 w-9 items-center justify-center rounded-full bg-white/70"
                    >
                      <AppIcon icon={Cancel01Icon} size={16} color={colors.ink} />
                    </Pressable>
                  </View>

                  <View className="mt-4 flex-row items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-3.5">
                    <AppIcon icon={Search01Icon} size={16} color={`${colors.ink}80`} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search for area, street name…"
                      placeholderTextColor="#6B756B"
                      autoFocus
                      className="flex-1 text-sm font-medium text-ink"
                    />
                    {searching && <ActivityIndicator size="small" color={colors.limeDeep} />}
                  </View>

                  <Pressable
                    onPress={() => closeDialog(onUseCurrentLocation)}
                    className="mt-2.5 flex-row items-center gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-3.5"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <AppIcon icon={GpsSignal01Icon} size={17} color={colors.limeDeep} />
                    <Text className="flex-1 text-sm font-medium text-lime-deep">Use your current location</Text>
                    <AppIcon icon={ArrowRight01Icon} size={16} color={colors.limeDeep} />
                  </Pressable>

                  {suggestions.length > 0 && (
                    <ScrollView style={{ maxHeight: 420 }} className="mt-3" keyboardShouldPersistTaps="handled">
                      {suggestions.map((place, index) => (
                        <Pressable
                          key={`${place.label}-${index}`}
                          onPress={() => closeDialog(() => onSelectPlace(place.coordinates))}
                          className="flex-row items-center gap-3 border-b border-white/50 py-3.5"
                          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                        >
                          <AppIcon icon={Location04Icon} size={16} color={`${colors.ink}70`} />
                          <Text className="flex-1 text-sm font-medium text-ink">{place.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {!searching && query.trim().length > 0 && suggestions.length === 0 && (
                    <Text className="mt-4 text-center text-xs font-medium text-ink/40">No places found</Text>
                  )}
                </Pressable>
              </View>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
