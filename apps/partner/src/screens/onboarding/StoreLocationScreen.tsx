// Step 2 of 5 — dedicated "mark your store on the map" step. Wraps the same
// real map-pin flow this app already has (LocationPinScreen — drag-a-fixed-
// center-pin, search, current-location, far-pin sanity check) rather than
// reinventing it; this screen's own job is just the polished entry card
// (a live static map preview once a pin is set) and the real inline
// "Use current location" permission flow, same sequence apps/customer's own
// LocationPermissionScreen uses.
//
// Shares OnboardingScaffold's top bar (back + centered progress) and big
// title so it reads as the same wizard as the form steps, but does NOT use
// the scaffold's ScrollView body — a map wants to fill fixed space, not
// scroll — so the chrome is composed here directly.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import { ArrowLeft01Icon, ArrowRight01Icon, Location05Icon, PinLocation01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocode, type Coordinates } from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import { PAGE_BG, WizardProgress } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreLocation'>;

const PREVIEW_DELTA = 0.006;

export function StoreLocationScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [district, setDistrict] = useState(draft.district);
  const [addressLine, setAddressLine] = useState(draft.addressLine);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(draft.coordinates);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const canContinue = district !== null && coordinates !== null;

  async function handleUseCurrentLocation() {
    setLocationError(null);
    setLocating(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setLocationError('Location access was denied — you can still mark your store on the map manually.');
        return;
      }
      const coords = await getCurrentCoordinates();
      const { addressLabel, city } = await reverseGeocode(coords);
      setCoordinates(coords);
      if (city) setDistrict(city);
      setAddressLine(addressLabel);
    } catch {
      setLocationError('Could not get your location. Try marking it on the map instead.');
    } finally {
      setLocating(false);
    }
  }

  function handleOpenLocationPin() {
    navigation.navigate('LocationPin', {
      initialCoordinates: coordinates,
      onConfirm: (nextCoordinates, nextDistrict, nextAddressLine) => {
        setCoordinates(nextCoordinates);
        setDistrict(nextDistrict);
        setAddressLine(nextAddressLine);
      },
    });
  }

  function handleNext() {
    if (!canContinue) return;
    saveStoreDraft({
      district: district ?? undefined,
      addressLine: addressLine ?? undefined,
      lat: coordinates?.latitude,
      lng: coordinates?.longitude,
    }).catch(() => {});

    navigation.navigate('OwnerDetails', { draft: { ...draft, district, addressLine, coordinates } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar style="dark" />

      {/* Same top bar as OnboardingScaffold — back arrow + centered progress. */}
      <View className="flex-row items-center px-5 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={16} className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <WizardProgress step={2} total={5} />
        <View className="h-9 w-9" />
      </View>

      <View className="px-6 pt-7">
        <Text className="text-4xl font-medium leading-[42px] tracking-tight text-ink">Mark your store on the map</Text>
        <Text className="mt-3 text-[16px] font-medium leading-[22px] text-ink/55">This pin is what riders use to find your store.</Text>
      </View>

      <View className="flex-1 px-6 pt-6">
        <Pressable
          onPress={handleOpenLocationPin}
          className="overflow-hidden rounded-[20px] bg-[#EEF0F2]"
          style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
        >
          {coordinates ? (
            <View>
              <MapView
                style={{ height: 220, width: '100%' }}
                pointerEvents="none"
                region={{ ...coordinates, latitudeDelta: PREVIEW_DELTA, longitudeDelta: PREVIEW_DELTA }}
                showsPointsOfInterests={false}
                showsCompass={false}
              >
                <Marker coordinate={coordinates}>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-ink shadow-lg">
                    <AppIcon icon={PinLocation01Icon} size={17} color="#FFFFFF" strokeWidth={2} />
                  </View>
                </Marker>
              </MapView>
              <View className="gap-2 border-t border-black/5 p-4">
                <Text className="text-[14.5px] font-semibold text-ink" numberOfLines={2}>
                  {addressLine ?? 'Pinned location'}
                </Text>
                <View className="flex-row items-center justify-between">
                  {district && <Text className="text-[12.5px] font-medium text-ink/50">{district}</Text>}
                  <Text className="text-[13px] font-bold" style={{ color: colors.limeDeep }}>
                    Adjust pin
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="h-[260px] items-center justify-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-lime-soft">
                <AppIcon icon={PinLocation01Icon} size={24} color={colors.limeDeep} />
              </View>
              <Text className="text-[14.5px] font-semibold text-ink">No location set yet</Text>
              <Text className="max-w-[240px] text-center text-[12.5px] font-medium text-ink/45">
                Tap to drop a pin, search an address, or use your current location.
              </Text>
            </View>
          )}
        </Pressable>

        {!coordinates && (
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={locating}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-ink py-3.5"
            style={({ pressed }) => ({ opacity: pressed || locating ? 0.85 : 1 })}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <AppIcon icon={Location05Icon} size={16} color="#FFFFFF" />
            )}
            <Text className="text-[14px] font-medium text-white">{locating ? 'Getting your location…' : 'Use current location'}</Text>
          </Pressable>
        )}
        {locationError && <Text className="mt-2 text-[13px] font-medium text-danger">{locationError}</Text>}
      </View>

      <View className="bg-white px-6 pb-safe-offset-4 pt-3">
        <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} trailingIcon={ArrowRight01Icon} />
      </View>
    </View>
  );
}
