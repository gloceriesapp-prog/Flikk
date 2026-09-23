// Page 2 — Personal Details. Full name, the account's own OTP-verified
// phone (read-only), date of birth (client-side 18+ check mirroring the
// backend's own isAtLeastAge in routes/riderOnboarding.ts), and a
// structured home address (house / street / landmark / city / district /
// state / pincode — industry standard). The address parts are composed
// into one canonical string (utils/address.ts) for the backend's single
// home_address column; nothing on the backend changes. Autosaves on Next,
// same best-effort pattern the partner wizard uses.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveRiderDraft } from '../../api/onboarding';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { composeAddress, isAddressComplete, isValidPincode } from '../../utils/address';
import { composeDob, isAtLeast18, splitDob } from '../../utils/dob';
import type { AuthStackParamList } from '../../navigation/types';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';
import { PhotoUploadCard } from './IdentityVerificationScreen';
import { StateSelect } from './components/StateSelect';

type Props = NativeStackScreenProps<AuthStackParamList, 'PersonalDetails'>;

const INPUT_CLASS = 'rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink';

export function PersonalDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const phone = useAuthStore((s) => s.phone);
  const initial = splitDob(draft.dateOfBirth);

  const [fullName, setFullName] = useState(draft.fullName);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(draft.profilePhotoUrl);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [houseNumber, setHouseNumber] = useState(draft.houseNumber);
  const [street, setStreet] = useState(draft.street);
  const [landmark, setLandmark] = useState(draft.landmark);
  const [city, setCity] = useState(draft.city);
  const [district, setDistrict] = useState(draft.district);
  // Single-zone launch is coastal Karnataka — prefill State so a rider
  // rarely has to type it, still editable if they're elsewhere.
  const [state, setState] = useState(draft.state || 'Karnataka');
  const [pincode, setPincode] = useState(draft.pincode);
  const [saving, setSaving] = useState(false);

  const dob = composeDob(day, month, year); // '' until all three valid
  const dobOldEnough = dob !== '' && isAtLeast18(dob);
  const dobEntered = day !== '' || month !== '' || year !== '';
  const pincodeEntered = pincode.length > 0;

  const addressParts = { houseNumber, street, landmark, city, district, state, pincode };
  const canContinue = fullName.trim().length > 0 && dobOldEnough && isAddressComplete(addressParts);

  async function handleNext() {
    if (!canContinue) return;
    const next = {
      ...draft,
      fullName: fullName.trim(),
      dateOfBirth: dob,
      profilePhotoUrl,
      houseNumber: houseNumber.trim(),
      street: street.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };
    setSaving(true);
    try {
      await saveRiderDraft({
        fullName: next.fullName,
        dateOfBirth: next.dateOfBirth,
        profilePhotoUrl: next.profilePhotoUrl ?? undefined,
        homeAddress: composeAddress(addressParts),
      });
    } catch {
      // Best-effort autosave — the Review step's own submit is the real save.
    } finally {
      setSaving(false);
    }
    navigation.navigate('IdentityVerification', { draft: next });
  }

  return (
    <OnboardingScaffold
      step={1}
      title="Tell us about yourself"
      subheading="Note: We use this to verify your profile and ensure everyone's safety."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} tone="blue" />}
    >
      <FieldCard label="Full name">
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Ramesh Shetty"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <PhotoUploadCard label="Profile photo (optional)" kind="profile" path={profilePhotoUrl} onUploaded={setProfilePhotoUrl} />

      <FieldCard label="Phone number">
        <View className="flex-row items-center justify-between rounded-2xl bg-[#EEF0F2] px-5 py-4">
          <Text className="text-[15px] font-medium text-ink/70">{phone ?? '—'}</Text>
          <View className="flex-row items-center gap-1">
            <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#1447E6" />
            <Text className="text-[12px] font-bold" style={{ color: '#1447E6' }}>
              Verified
            </Text>
          </View>
        </View>
      </FieldCard>

      <FieldCard label="Date of birth">
        <View className="flex-row gap-3">
          <DobBox value={day} onChangeText={setDay} placeholder="DD" maxLength={2} />
          <DobBox value={month} onChangeText={setMonth} placeholder="MM" maxLength={2} />
          <DobBox value={year} onChangeText={setYear} placeholder="YYYY" maxLength={4} flex={1.6} />
        </View>
        {dobEntered && !dobOldEnough && (
          <Text className="text-[12px] font-medium text-danger">You must be at least 18 to ride for Gloceries.</Text>
        )}
      </FieldCard>

      {/* Structured home address — separate fields, industry standard. */}
      <FieldCard label="Flat / House no., Building">
        <TextInput
          value={houseNumber}
          onChangeText={setHouseNumber}
          placeholder="e.g. #12, Shanthi Nivas"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <FieldCard label="Street / Area / Locality">
        <TextInput
          value={street}
          onChangeText={setStreet}
          placeholder="e.g. Car Street, Kaup"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <FieldCard label="Landmark (optional)">
        <TextInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="e.g. Near St. Mary's Church"
          placeholderTextColor="#9AA5A3"
          className={INPUT_CLASS}
        />
      </FieldCard>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FieldCard label="City / Town">
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Udupi"
              placeholderTextColor="#9AA5A3"
              className={INPUT_CLASS}
            />
          </FieldCard>
        </View>
        <View className="flex-1">
          <FieldCard label="District">
            <TextInput
              value={district}
              onChangeText={setDistrict}
              placeholder="e.g. Udupi"
              placeholderTextColor="#9AA5A3"
              className={INPUT_CLASS}
            />
          </FieldCard>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FieldCard label="State">
            <StateSelect value={state} onSelect={setState} />
          </FieldCard>
        </View>
        <View className="flex-1">
          <FieldCard label="Pincode">
            <TextInput
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="6-digit"
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              maxLength={6}
              className={INPUT_CLASS}
            />
          </FieldCard>
        </View>
      </View>
      {pincodeEntered && !isValidPincode(pincode) && (
        <Text className="-mt-2 text-[12px] font-medium text-danger">Enter a valid 6-digit pincode.</Text>
      )}
    </OnboardingScaffold>
  );
}

function DobBox({
  value,
  onChangeText,
  placeholder,
  maxLength,
  flex = 1,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  maxLength: number;
  flex?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
      placeholder={placeholder}
      placeholderTextColor="#9AA5A3"
      keyboardType="number-pad"
      maxLength={maxLength}
      style={{ flex }}
      className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-center text-[15px] font-medium text-ink"
    />
  );
}
