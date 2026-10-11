// Step 3 of 5 — owner's own full name, their real OTP-verified login phone
// (read-only display, pulled from the account's own session via
// checkAccountStatus), and an optional contact email (writes to users.email).

import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { checkAccountStatus, saveStoreDraft } from '../../api/auth';
import { ApiError } from '../../api/client';
import { uploadStoreDocument } from '../../api/payouts';
import { pickAndCompressImage } from '../../media/pickAndCompressImage';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { formatPhone } from '../../utils/formatPhone';
import { DocPickerCard } from './components/DocPickerCard';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OwnerDetails'>;

export function OwnerDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [ownerName, setOwnerName] = useState(draft.ownerName);
  const [ownerEmail, setOwnerEmail] = useState(draft.ownerEmail);
  const [phone, setPhone] = useState<string | null>(null);
  const [profilePhotoPath, setProfilePhotoPath] = useState(draft.profilePhotoPath);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkAccountStatus()
      .then(({ phone: accountPhone }) => {
        if (!cancelled) setPhone(accountPhone ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canContinue = ownerName.trim().length > 0;

  async function handlePickProfilePhoto() {
    const picked = await pickAndCompressImage();
    if (!picked) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const { path } = await uploadStoreDocument(picked.base64, 'profile');
      setProfilePhotoPath(path);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleNext() {
    if (!canContinue) return;
    const trimmedName = ownerName.trim();
    const trimmedEmail = ownerEmail.trim();

    // Best-effort autosave — fire-and-forget so it never blocks navigation.
    // warn (not error) so a transient network blip shows a yellow warning,
    // not a red "Console Error" box that reads as a crash.
    void saveStoreDraft({ ownerName: trimmedName, ownerEmail: trimmedEmail, profilePhotoPath: profilePhotoPath ?? undefined }).catch(
      (err) => console.warn('[OwnerDetails] saveStoreDraft failed (best-effort)', err),
    );

    navigation.navigate('BusinessDocuments', { draft: { ...draft, ownerName: trimmedName, ownerEmail: trimmedEmail, profilePhotoPath } });
  }

  return (
    <OnboardingScaffold
      step={3}
      title="Owner details"
      subheading="Who should we contact about this store?"
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} trailingIcon={ArrowRight01Icon} />}
    >
      <DocPickerCard
        label="Owner photo"
        hint="A passport-style photo of the owner. Kept private for verification."
        hasPhoto={!!profilePhotoPath}
        uploading={uploadingPhoto}
        onPick={() => void handlePickProfilePhoto()}
        error={photoError}
      />

      <FieldCard label="Owner full name">
        <TextInput
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="e.g. Ramesh Shetty"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <FieldCard label="Owner phone number">
        <View className="flex-row items-center justify-between rounded-2xl bg-[#EEF0F2] px-5 py-4">
          <Text className="text-[15px] font-medium text-ink/70">{phone ? formatPhone(phone) : '—'}</Text>
          <View className="flex-row items-center gap-1">
            <AppIcon icon={CheckmarkCircle02Icon} size={14} color={colors.limeDeep} />
            <Text className="text-[12px] font-bold" style={{ color: colors.limeDeep }}>
              Verified
            </Text>
          </View>
        </View>
        <Text className="text-[12px] font-medium text-ink/40">Your verified login number — change it by signing in with a new one.</Text>
      </FieldCard>

      <FieldCard label="Email (optional)">
        <TextInput
          value={ownerEmail}
          onChangeText={setOwnerEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9AA5A3"
          autoCapitalize="none"
          keyboardType="email-address"
          className={INPUT_CLASS}
        />
      </FieldCard>
    </OnboardingScaffold>
  );
}
