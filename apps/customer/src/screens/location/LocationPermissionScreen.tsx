import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppImage } from '../../components/AppImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocode } from '../../location/geocoding';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LocationPermission'>;
const HERO_IMAGE_URI = 'https://images.gloceries.com/illustrations/location-permission.png';
// Essential onboarding artwork remains visible before a network request finishes.
const HERO_FALLBACK = require('../../../assets/illustrations/location-permission.png');

export function LocationPermissionScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const requesting = useRef(false);

  async function handleAllow() {
    if (requesting.current) return;
    requesting.current = true;
    setError(null);
    setLoading(true);
    try {
      const granted = await requestLocationPermission();
      if (!navigation.isFocused()) return;
      if (!granted) {
        navigation.replace('LocationSearch');
        return;
      }
      const coords = await getCurrentCoordinates();
      if (!navigation.isFocused()) return;
      const { addressLabel, city } = await reverseGeocode(coords);
      if (navigation.isFocused()) navigation.replace('LocationSearch', { ...coords, addressLabel, city });
    } catch {
      if (navigation.isFocused()) setError('Could not get your location. You can search for it instead.');
    } finally {
      requesting.current = false;
      if (navigation.isFocused()) setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <View className="flex-1 bg-white" style={{ minHeight: 160 }}>
        <AppImage
          source={imageFailed ? HERO_FALLBACK : { uri: HERO_IMAGE_URI }}
          placeholder={HERO_FALLBACK}
          placeholderContentFit="contain"
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityLabel="Find shops near your location"
          onError={() => setImageFailed(true)}
        />
      </View>
      <View className="bg-white px-6 pb-6 pt-4">
        <Text accessibilityRole="header" className="text-center text-2xl font-bold text-[#181A1B]">Find everything nearby</Text>
        <Text className="mt-2 text-center text-[15px] font-medium leading-5 text-[#181A1B]/60">
          Discover stores around you and get faster, more accurate deliveries to your doorstep.
        </Text>
        {error && <Text accessibilityLiveRegion="polite" className="mt-3 text-center text-[13px] font-medium text-red-500">{error}</Text>}
        <View className="mt-6 gap-3">
          <PrimaryButton label="Use my current location" onPress={handleAllow} loading={loading} variant="blue" />
          <Pressable accessibilityRole="button" onPress={() => navigation.replace('LocationSearch')} className="py-2">
            <Text className="text-center text-[15px] font-semibold text-[#181A1B]/70">Choose location manually</Text>
          </Pressable>
        </View>
        <View className="pb-safe" />
      </View>
    </View>
  );
}
