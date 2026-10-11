// Step 4 of 5 — PAN (required, real format check), GST (optional), Udyam
// registration number (optional). FSSAI/Shop & Establishment license are
// still real, storable fields (StoreDraft's own note) but are no longer
// collected in the wizard — only editable later in Store Settings.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { ApiError } from '../../api/client';
import { uploadStoreDocument } from '../../api/payouts';
import { pickAndCompressImage } from '../../media/pickAndCompressImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { isValidPanFormat } from '../../utils/documentValidation';
import { DocPickerCard } from './components/DocPickerCard';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessDocuments'>;

export function BusinessDocumentsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [panNumber, setPanNumber] = useState(draft.panNumber);
  const [gstNumber, setGstNumber] = useState(draft.gstNumber);
  const [udyamNumber, setUdyamNumber] = useState(draft.udyamNumber);
  const [aadhaarPhotoPath, setAadhaarPhotoPath] = useState(draft.aadhaarPhotoPath);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const panValid = isValidPanFormat(panNumber);
  const canContinue = panValid;

  async function handlePickAadhaarPhoto() {
    const picked = await pickAndCompressImage();
    if (!picked) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const { path } = await uploadStoreDocument(picked.base64, 'aadhaar');
      setAadhaarPhotoPath(path);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleNext() {
    if (!canContinue) return;
    const trimmedPan = panNumber.trim().toUpperCase();
    const trimmedGst = gstNumber.trim();
    const trimmedUdyam = udyamNumber.trim();

    // Best-effort autosave — fire-and-forget so it never blocks navigation.
    // warn (not error) so a transient network blip shows a yellow warning,
    // not a red "Console Error" box that reads as a crash.
    void saveStoreDraft({ panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam, aadhaarPhotoPath: aadhaarPhotoPath ?? undefined }).catch(
      (err) => console.warn('[BusinessDocuments] saveStoreDraft failed (best-effort)', err),
    );

    navigation.navigate('StoreHours', {
      draft: { ...draft, panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam, aadhaarPhotoPath },
    });
  }

  return (
    <OnboardingScaffold
      step={4}
      title="Business documents"
      subheading="PAN is required. Add a photo of the owner's Aadhaar for verification."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} trailingIcon={ArrowRight01Icon} />}
    >
      {/* PAN keeps its own label row so the required-star marker survives —
          FieldCard's label is plain text. */}
      <View className="gap-2.5">
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] font-semibold text-ink/80">PAN number</Text>
          <Text className="text-[15px] font-bold leading-none text-danger">*</Text>
        </View>
        <TextInput
          value={panNumber}
          onChangeText={setPanNumber}
          placeholder="e.g. ABCDE1234F"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="characters"
          maxLength={10}
          className={INPUT_CLASS}
        />
        {panNumber.length > 0 && !panValid && (
          <Text className="text-[12px] font-medium text-danger">Format should be ABCDE1234F.</Text>
        )}
        <Text className="text-[12px] font-medium text-ink/40">Required for payout tax compliance.</Text>
      </View>

      <FieldCard label="GST number (optional)">
        <TextInput
          value={gstNumber}
          onChangeText={setGstNumber}
          placeholder="Add later if you don't have one yet"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="characters"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <FieldCard label="Udyam registration number (optional)">
        <TextInput
          value={udyamNumber}
          onChangeText={setUdyamNumber}
          placeholder="Add later if you don't have one yet"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="characters"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <DocPickerCard
        label="Aadhaar photo"
        hint="A clear photo of the owner's Aadhaar card. Encrypted and kept private."
        hasPhoto={!!aadhaarPhotoPath}
        uploading={uploadingPhoto}
        onPick={() => void handlePickAadhaarPhoto()}
        error={photoError}
      />
    </OnboardingScaffold>
  );
}
