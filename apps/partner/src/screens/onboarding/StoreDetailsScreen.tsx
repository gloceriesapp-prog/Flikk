// Step 2 of 3 in the Store Setup wizard — photo, location, and an optional
// GST number. Photo uploads immediately on pick (not deferred to submit)
// so StoreReviewScreen next only ever deals with a hosted URL, never a
// local file — see uploadStorePhoto's own note and StoreDraft's shape.

import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft, uploadStorePhoto } from '../../api/auth';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { compressImageToTarget } from '../../media/compressImage';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { Coordinates } from '../../location/geocoding';
import { colors } from '../../theme/tokens';
import { isValidFssaiFormat, isValidPanFormat } from '../../utils/documentValidation';
import { StoreLocationCard } from './components/StoreLocationCard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreDetails'>;

const ACCENT = '#1754cf';

export function StoreDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [photoUrl, setPhotoUrl] = useState(draft.photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [district, setDistrict] = useState(draft.district);
  const [addressLine, setAddressLine] = useState(draft.addressLine);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(draft.coordinates);
  const [gstNumber, setGstNumber] = useState(draft.gstNumber);
  const [shopLicenseNumber, setShopLicenseNumber] = useState(draft.shopLicenseNumber);
  const [fssaiNumber, setFssaiNumber] = useState(draft.fssaiNumber);
  const [panNumber, setPanNumber] = useState(draft.panNumber);

  // PAN is the one compulsory document — real per an explicit ask, applies
  // to every store regardless of category (tax/payout compliance).
  // FSSAI/GST/shop-license stay optional, same as before.
  const panValid = isValidPanFormat(panNumber);
  const canContinue = district !== null && panValid;

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    // quality: 1 (not a fixed 0.6 baked in here) — compressImageToTarget
    // below decides how much compression an image actually needs based on
    // its real size, instead of blindly degrading every photo the same
    // amount regardless of whether it needed it.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.base64);
      // Untouched (already under target) keeps its real original type;
      // anything compressImageToTarget actually re-encoded is always JPEG.
      const contentType = compressed.uri === asset.uri ? (asset.mimeType ?? 'image/jpeg') : 'image/jpeg';
      const { url } = await uploadStorePhoto(compressed.base64, contentType, compressed.uri);
      setPhotoUrl(url);
      // Photo's already hosted the moment this resolves — save it now
      // rather than waiting for "Next" so it survives an app close even
      // mid-Step-2, same as Step 1's own save-then-advance. Best-effort —
      // .catch() here matters, not just the `void`: `void promise` only
      // discards the return value, a still-rejecting promise with no
      // handler surfaces as an uncaught "Something went wrong" error
      // screen for a background save nobody was watching.
      saveStoreDraft({ photoUrl: url }).catch(() => {});
    } catch (err) {
      // Previously uncaught entirely — an upload failure (e.g. the real
      // bucket-doesn't-exist bug this replaced) just left the photo box
      // empty forever with zero indication anything went wrong.
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleOpenLocationPin(seedCoordinates: Coordinates | null = coordinates) {
    navigation.navigate('LocationPin', {
      initialCoordinates: seedCoordinates,
      onConfirm: (nextCoordinates, nextDistrict, nextAddressLine) => {
        setCoordinates(nextCoordinates);
        setDistrict(nextDistrict);
        setAddressLine(nextAddressLine);
      },
    });
  }

  function handleNext() {
    if (!canContinue) return;
    const trimmedGst = gstNumber.trim();
    const trimmedShopLicense = shopLicenseNumber.trim();
    const trimmedFssai = fssaiNumber.trim();
    const trimmedPan = panNumber.trim().toUpperCase();

    // Best-effort, same reasoning as handlePickPhoto's own note above.
    saveStoreDraft({
      district: district ?? undefined,
      addressLine: addressLine ?? undefined,
      lat: coordinates?.latitude,
      lng: coordinates?.longitude,
      gstNumber: trimmedGst,
      shopLicenseNumber: trimmedShopLicense,
      fssaiNumber: trimmedFssai,
      panNumber: trimmedPan,
    }).catch(() => {});

    navigation.navigate('StoreReview', {
      draft: {
        ...draft,
        photoUrl,
        district,
        addressLine,
        coordinates,
        gstNumber: trimmedGst,
        shopLicenseNumber: trimmedShopLicense,
        fssaiNumber: trimmedFssai,
        panNumber: trimmedPan,
      },
    });
  }

  return (
    // Keyboard was covering the Next button below (no keyboard-avoidance
    // at all) — same fix/reasoning as LoginScreen.tsx's own note.
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white pb-safe pt-safe">
        <View className="px-6 pt-4">
          <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step 2 of 3</Text>
          <Text className="mt-1 text-[28px] font-bold text-ink">Add store details</Text>
          <Text className="mt-1 text-[15px] font-medium text-ink/60">A photo and location help customers find you.</Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 pt-6" keyboardShouldPersistTaps="handled">
          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-ink/60">Store photo</Text>
            <Pressable
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
              className="h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-mist"
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={ACCENT} />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="items-center gap-2">
                  <AppIcon icon={Camera01Icon} size={24} color={`${colors.ink}60`} />
                  <Text className="text-sm font-medium text-ink/50">Add a storefront photo</Text>
                </View>
              )}
            </Pressable>
            {photoError && <Text className="text-[13px] font-medium text-danger">{photoError}</Text>}
          </View>

          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-ink/60">Location</Text>
            <StoreLocationCard
              district={district}
              onUseCurrentLocation={() => handleOpenLocationPin()}
              onSelectPlace={(place) => handleOpenLocationPin(place)}
            />
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center gap-1">
              <Text className="text-[15px] font-medium text-ink/60">PAN number</Text>
              <Text className="text-[16px] font-bold text-danger leading-none mt-[1px]">*</Text>
            </View>
            <TextInput
              value={panNumber}
              onChangeText={setPanNumber}
              placeholder="e.g. ABCDE1234F"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              maxLength={10}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-ink"
            />
            {panNumber.length > 0 && !panValid && (
              <Text className="text-[13px] font-medium text-danger">Format should be ABCDE1234F.</Text>
            )}
            <Text className="text-[13px] font-medium text-ink/40">
              Required for payout tax compliance. Stored securely, never shared — we check the format only, not against a
              government database.
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-ink/60">FSSAI license number (optional)</Text>
            <TextInput
              value={fssaiNumber}
              onChangeText={setFssaiNumber}
              placeholder="14-digit license or registration no."
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              maxLength={14}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-ink"
            />
            {fssaiNumber.length > 0 && !isValidFssaiFormat(fssaiNumber) && (
              <Text className="text-[13px] font-medium text-danger">Must be exactly 14 digits.</Text>
            )}
          </View>

          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-ink/60">GST number (optional)</Text>
            <TextInput
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="e.g. 29ABCDE1234F1Z5"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-ink/60">Shop & Establishment license (optional)</Text>
            <TextInput
              value={shopLicenseNumber}
              onChangeText={setShopLicenseNumber}
              placeholder="License number, if you have one"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-ink"
            />
          </View>
        </ScrollView>

        <View className="px-6 pb-4 pt-2">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
