// Page 3 — Identity Verification. Aadhaar + Driving Licence numbers, plus a
// front photo of each. Photos go straight to the PRIVATE rider-documents
// bucket via POST /rider/document-photo (base64 in, object PATH out — see
// backend/src/routes/riderOnboarding.ts on why these are never public URLs)
// and only the returned path rides on in the draft, never the image bytes.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { AppImage as Image } from '../../components/AppImage';
import * as ImagePicker from 'expo-image-picker';
import { ArrowRight01Icon, CheckmarkCircle02Icon, ImageUpload01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveRiderDraft, uploadRiderDocumentPhoto, type RiderDocumentKind } from '../../api/onboarding';
import { compressImageToTarget } from '../../media/compressImage';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';

type Props = NativeStackScreenProps<AuthStackParamList, 'IdentityVerification'>;

const AADHAAR_DIGITS = 12;

export function IdentityVerificationScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [aadhaarNumber, setAadhaarNumber] = useState(draft.aadhaarNumber);
  const [dlNumber, setDlNumber] = useState(draft.dlNumber);
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState<string | null>(draft.aadhaarPhotoUrl);
  const [dlPhotoUrl, setDlPhotoUrl] = useState<string | null>(draft.dlPhotoUrl);
  const [saving, setSaving] = useState(false);

  const canContinue =
    aadhaarNumber.replace(/\s/g, '').length === AADHAAR_DIGITS && dlNumber.trim().length > 0 && !!aadhaarPhotoUrl && !!dlPhotoUrl;

  async function handleNext() {
    if (!canContinue) return;
    const next = {
      ...draft,
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
      dlNumber: dlNumber.trim(),
      aadhaarPhotoUrl,
      dlPhotoUrl,
    };
    setSaving(true);
    try {
      await saveRiderDraft({
        aadhaarNumber: next.aadhaarNumber,
        dlNumber: next.dlNumber,
        aadhaarPhotoUrl: next.aadhaarPhotoUrl ?? undefined,
        dlPhotoUrl: next.dlPhotoUrl ?? undefined,
      });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }
    navigation.navigate('VehicleDetails', { draft: next });
  }

  return (
    <OnboardingScaffold
      step={2}
      title="Verify your identity"
      subheading="Required for every rider on Gloceries — keeps customers and stores safe."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} tone="blue" />}
    >
      <FieldCard label="Aadhaar number">
        <TextInput
          value={aadhaarNumber}
          onChangeText={(t) => setAadhaarNumber(t.replace(/[^0-9]/g, '').slice(0, AADHAAR_DIGITS))}
          placeholder="12-digit number"
          placeholderTextColor="#9AA5A3"
          keyboardType="number-pad"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <PhotoUploadCard label="Aadhaar photo (front)" kind="aadhaar" path={aadhaarPhotoUrl} onUploaded={setAadhaarPhotoUrl} />

      <FieldCard label="Driving licence number">
        <TextInput
          value={dlNumber}
          onChangeText={setDlNumber}
          placeholder="e.g. KA19 20230001234"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="characters"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <PhotoUploadCard label="Driving licence photo (front)" kind="dl" path={dlPhotoUrl} onUploaded={setDlPhotoUrl} />
    </OnboardingScaffold>
  );
}

export function PhotoUploadCard({
  label,
  kind,
  path,
  onUploaded,
  hint = 'Front side · clear & fully readable',
}: {
  label: string;
  kind: RiderDocumentKind;
  path: string | null;
  onUploaded: (path: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload your document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) return;

    setUploading(true);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.base64);
      const { path: uploadedPath } = await uploadRiderDocumentPhoto(compressed.base64, kind);
      setPreviewUri(compressed.uri);
      onUploaded(uploadedPath);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const done = !!path;

  return (
    <FieldCard label={label}>
      <Pressable
        onPress={pick}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={done ? `Replace ${label}` : `Upload ${label}`}
        style={{ minHeight: 156 }}
        className={`items-center justify-center rounded-3xl px-5 py-7 ${done ? 'bg-[#EEF3FF]' : 'border border-dashed border-[#C6CDD8] bg-[#F7F9FB]'}`}
      >
        {uploading ? (
          <View className="items-center gap-3">
            <ActivityIndicator color="#1447E6" />
            <Text className="text-[14px] font-medium text-ink/60">Uploading…</Text>
          </View>
        ) : previewUri || done ? (
          <View className="w-full items-center gap-3">
            {previewUri ? (
              <Image source={{ uri: previewUri }} className="h-32 w-full rounded-2xl" resizeMode="cover" />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#1447E6]/10">
                <AppIcon icon={CheckmarkCircle02Icon} size={30} color="#1447E6" />
              </View>
            )}
            <View className="flex-row items-center gap-1.5">
              <AppIcon icon={CheckmarkCircle02Icon} size={15} color={colors.success} />
              <Text className="text-[13px] font-semibold text-ink/70">Photo added — tap to replace</Text>
            </View>
          </View>
        ) : (
          <View className="items-center gap-3">
            {/* Big centered upload icon (hugeicons ImageUpload01) in a soft
                blue tile — the premium, unmistakable "tap here" affordance. */}
            <View className="h-[68px] w-[68px] items-center justify-center rounded-2xl bg-[#1447E6]/10">
              <AppIcon icon={ImageUpload01Icon} size={34} color="#1447E6" />
            </View>
            <Text className="text-[15px] font-semibold text-ink">Upload photo</Text>
            <Text className="text-center text-[12px] font-medium text-ink/45">{hint}</Text>
          </View>
        )}
      </Pressable>
    </FieldCard>
  );
}
