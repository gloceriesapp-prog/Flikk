// Step 1 of the onboarding wizard — store name, category, store contact
// phone only. Photo and address/map used to live here too (see git history)
// but were split out per an explicit ask to keep each step focused on one
// topic: photo is no longer collected during onboarding at all (added later
// via Store Settings), and location/map moved to its own StoreLocation step.

import { useState } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { Text, TextInput } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { ApiError } from '../../api/client';
import { uploadStoreDocument } from '../../api/payouts';
import { pickAndCompressImage } from '../../media/pickAndCompressImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { categoryNeedsDrugLicense, StoreCategoryPicker, useStoreCategories } from '../store-settings/components/StoreCategoryPicker';
import { DocPickerCard } from './components/DocPickerCard';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList, StoreDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreDetails'>;

// Step 1 is now the wizard's entry point (the old "Get Started" intro screen
// was removed), so it can be reached with no params — start from a blank
// draft in that case.
const EMPTY_STORE_DRAFT: StoreDraft = {
  storeName: '', category: '', phone: '', district: null, addressLine: null, manualAddress: '',
  coordinates: null, photoUrl: null, gstNumber: '', ownerName: '', ownerEmail: '',
  shopLicenseNumber: '', fssaiNumber: '', panNumber: '', udyamNumber: '', drugLicenseNumber: '',
  openTime: '', closeTime: '',
  profilePhotoPath: null, aadhaarPhotoPath: null, storePhotoPath: null,
};

export function StoreDetailsScreen({ navigation, route }: Props) {
  // Returning applicants enter this screen as the stack root. There is
  // no Login/OTP route behind it after the authenticated stack remounts.
  const canGoBack = useNavigationState(state => state.index > 0);
  const draft = route.params?.draft ?? EMPTY_STORE_DRAFT;
  const [storeName, setStoreName] = useState(draft.storeName);
  const [category, setCategory] = useState(draft.category);
  const [phone, setPhone] = useState(draft.phone);
  const [drugLicenseNumber, setDrugLicenseNumber] = useState(draft.drugLicenseNumber ?? '');
  const [storePhotoPath, setStorePhotoPath] = useState(draft.storePhotoPath);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const categories = useStoreCategories();
  const needsDrugLicense = categoryNeedsDrugLicense(categories, category);
  const isKnownCategory = categories.some((option) => option.name === category);

  const canContinue =
    storeName.trim().length > 0 && isKnownCategory && phone.trim().length >= 10 && (!needsDrugLicense || drugLicenseNumber.trim().length > 0);

  async function handlePickStorePhoto() {
    const picked = await pickAndCompressImage();
    if (!picked) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const { path } = await uploadStoreDocument(picked.base64, 'store');
      setStorePhotoPath(path);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleNext() {
    if (!canContinue) return;
    const trimmedName = storeName.trim();
    const trimmedPhone = phone.trim();
    const trimmedLicense = needsDrugLicense ? drugLicenseNumber.trim() : '';

    // Best-effort autosave — fire-and-forget so it never blocks navigation.
    // A failed save just costs a resume, not a blocked flow (fetchStoreDraft's
    // own note in api/auth.ts). warn (not error) so a transient network blip
    // shows a yellow warning, not a red "Console Error" box that reads as a crash.
    void saveStoreDraft({ storeName: trimmedName, category, phone: trimmedPhone, drugLicenseNumber: trimmedLicense, storePhotoPath: storePhotoPath ?? undefined }).catch(
      (err) => console.warn('[StoreDetails] saveStoreDraft failed (best-effort)', err),
    );

    navigation.navigate('StoreLocation', {
      draft: { ...draft, storeName: trimmedName, category, phone: trimmedPhone, drugLicenseNumber: trimmedLicense, storePhotoPath },
    });
  }

  return (
    <OnboardingScaffold
      step={1}
      title="Store details"
      subheading="What's your store called, and how can customers reach it?"
      onBack={canGoBack ? () => {
        if (navigation.canGoBack()) navigation.goBack();
      } : undefined}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} trailingIcon={ArrowRight01Icon} />}
    >
      <FieldCard label="Store name">
        <TextInput
          value={storeName}
          onChangeText={setStoreName}
          placeholder="e.g. Coastal Mart & General Store"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <DocPickerCard
        label="Store photo"
        hint="A clear photo of your storefront. Kept private for verification."
        hasPhoto={!!storePhotoPath}
        uploading={uploadingPhoto}
        onPick={() => void handlePickStorePhoto()}
        error={photoError}
      />

      <FieldCard label="Category">
        <StoreCategoryPicker selected={category} onSelect={setCategory} />
      </FieldCard>

      {needsDrugLicense && (
        <FieldCard label="Drug licence number">
          <TextInput
            value={drugLicenseNumber}
            onChangeText={setDrugLicenseNumber}
            placeholder="From your state Drug Control authority"
            placeholderTextColor="#9AA5A3"
            autoCapitalize="characters"
            maxLength={100}
            className={INPUT_CLASS}
          />
          <Text className="text-[12px] font-medium text-ink/40">Required for a pharmacy.</Text>
        </FieldCard>
      )}

      <FieldCard label="Store phone number">
        <TextInput
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
          placeholder="10-digit number customers can call"
          placeholderTextColor="#9AA5A3"
          keyboardType="number-pad"
          maxLength={10}
          className={INPUT_CLASS}
        />
        <Text className="text-[12px] font-medium text-ink/40">Can be different from your login number.</Text>
      </FieldCard>
    </OnboardingScaffold>
  );
}
