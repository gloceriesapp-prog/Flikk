// Soft-ask screen shown once, right after login, before the OS permission
// dialog fires. Priming the user with our own copy first (rather than firing
// the native prompt cold) measurably reduces hard-denial rates — standard
// practice, not decoration.
//
// Allow  -> capture GPS position -> LocationSearchScreen (map pre-centered
//           there, user still confirms the exact pin before it's saved)
// Deny   -> LocationSearchScreen (default center, manual search instead)
//
// Illustration redesigned again — full-bleed hero photo up top (same
// fade-into-sheet pattern as LoginScreen.tsx's own hero) instead of a small
// centered circle, which read as cramped/placeholder-ish rather than
// premium. Bottom fade mask uses white-alpha stops, not the literal string
// 'transparent' — same LinearGradient parsing gotcha LoginScreen.tsx and
// BottomNavBar.tsx already document (transparent parses as black-alpha-0,
// which would fade through a muddy gray instead of a clean dissolve).
//
// Allow button uses PrimaryButton's existing variant="blue"
// (LoginScreen.tsx's own #2457F5, per an explicit ask) rather than the
// shared default coral — a deliberate per-screen opt-in, same as that
// file's own note on when blue is appropriate to use instead of coral.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppImage as Image } from '../../components/AppImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocode } from '../../location/geocoding';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationPermission'>;

const HERO_IMAGE_URI = 'https://i.pinimg.com/736x/c3/6c/2e/c36c2e68d1aae5ab77f56a21ef52b788.jpg';

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
      const { addressLabel, city } = await reverseGeocode(coords);
      navigation.replace('LocationSearch', { ...coords, addressLabel, city });
    } catch {
      setError('Could not get your location. You can search for it instead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-mist">
      <View className="flex-1">
        <Image source={{ uri: HERO_IMAGE_URI }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(246,250,240,0)', 'rgba(246,250,240,0.55)', 'rgba(246,250,240,0.9)', '#F6FAF0']}
          locations={[0, 0.45, 0.75, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}
        />
      </View>

      <View className="gap-4 px-6 pb-4 pt-4">
        <Text className="text-center text-2xl font-extrabold text-ink">Enable your location</Text>
        <Text className="text-center text-[15px] leading-5 text-ink/65">
          We use your location to show stores near you and get your order to the right address.
        </Text>
        {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

        <View className="gap-3 pb-4 pt-2">
          <PrimaryButton label="Use My Current Location" onPress={handleAllow} loading={loading} variant="blue" />
          <Text
            onPress={() => navigation.replace('LocationSearch')}
            className="py-2 text-center text-sm font-semibold text-ink/70 underline"
          >
            Select it manually
          </Text>
        </View>
      </View>
      <View className="bg-mist pb-safe" />
    </View>
  );
}
