// Step 2 of 3 in the Store Setup wizard — photo, location, and an optional
// GST number. Photo uploads immediately on pick (not deferred to submit)
// so StoreReviewScreen next only ever deals with a hosted URL, never a
// local file — see uploadStorePhoto's own note and StoreDraft's shape.

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { uploadStorePhoto } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { Coordinates } from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import { StoreLocationCard } from './components/StoreLocationCard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreDetails'>;

export function StoreDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [photoUrl, setPhotoUrl] = useState(draft.photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [district, setDistrict] = useState(draft.district);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(draft.coordinates);
  const [gstNumber, setGstNumber] = useState(draft.gstNumber);

  const canContinue = district !== null;

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploadingPhoto(true);
    try {
      const contentType = asset.mimeType ?? 'image/jpeg';
      const { url } = await uploadStorePhoto(asset.base64, contentType, asset.uri);
      setPhotoUrl(url);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleOpenLocationPin(seedCoordinates: Coordinates | null = coordinates) {
    navigation.navigate('LocationPin', {
      initialCoordinates: seedCoordinates,
      onConfirm: (nextCoordinates, nextDistrict) => {
        setCoordinates(nextCoordinates);
        setDistrict(nextDistrict);
      },
    });
  }

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('StoreReview', {
      draft: { ...draft, photoUrl, district, coordinates, gstNumber: gstNumber.trim() },
    });
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="px-6 pt-4">
        <Text className="text-xs font-bold uppercase tracking-wide text-lime-deep">Step 2 of 3</Text>
        <Text className="mt-1 text-3xl font-medium text-ink">Add store details</Text>
        <Text className="mt-1 text-base font-medium text-ink/60">A photo and location help customers find you.</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 pt-6" keyboardShouldPersistTaps="handled">
        <View className="gap-1.5">
          <Text className="text-base font-medium text-ink/60">Store photo</Text>
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            className="h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-mist"
          >
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.limeDeep} />
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="items-center gap-2">
                <AppIcon icon={Camera01Icon} size={24} color={`${colors.ink}60`} />
                <Text className="text-sm font-medium text-ink/50">Add a storefront photo</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View className="gap-1.5">
          <Text className="text-base font-medium text-ink/60">Location</Text>
          <StoreLocationCard
            district={district}
            onUseCurrentLocation={() => handleOpenLocationPin()}
            onSelectPlace={(place) => handleOpenLocationPin(place)}
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-base font-medium text-ink/60">GST number (optional)</Text>
          <TextInput
            value={gstNumber}
            onChangeText={setGstNumber}
            placeholder="e.g. 29ABCDE1234F1Z5"
            placeholderTextColor="#9AA5A3"
            autoCapitalize="characters"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-medium text-ink"
          />
        </View>
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} />
      </View>
    </View>
  );
}
