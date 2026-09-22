// Page 6 — Review & Submit. Read-only summary of everything the wizard
// collected; the only way to change a value is "Edit", which routes back to
// the exact step that owns it (no silent fat-fingering on this screen).
// Submit POSTs the real application — role stays 'customer' until a founder
// approves (migrations/042_rider_onboarding.sql), so this only flips
// applicationSubmitted, which swaps RootNavigator to AccountStatusScreen.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitRiderApplication } from '../../api/onboarding';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { splitDob } from '../../utils/dob';
import { composeAddress, isAddressComplete } from '../../utils/address';
import { WizardProgress, WIZARD_TOTAL_STEPS } from './components/OnboardingScaffold';
import type { AuthStackParamList, RiderDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ReviewSubmit'>;

const VEHICLE_LABEL: Record<NonNullable<RiderDraft['vehicleType']>, string> = {
  bicycle: 'Bicycle',
  scooter: 'Scooter',
  motorcycle: 'Motorcycle',
};

export function ReviewSubmitScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const clearSession = useAuthStore((s) => s.clear);

  // Every required field is present — the per-step gates already enforced
  // this, but guarding here keeps the submit honest even if a step is ever
  // reordered. Photos are required for a real submission (private-bucket
  // paths), so a null here means an incomplete draft, not "optional".
  const complete =
    !!draft.fullName &&
    !!draft.dateOfBirth &&
    isAddressComplete(draft) &&
    !!draft.aadhaarNumber &&
    !!draft.aadhaarPhotoUrl &&
    !!draft.dlNumber &&
    !!draft.dlPhotoUrl &&
    !!draft.vehicleType &&
    (draft.vehicleType === 'bicycle' || !!draft.vehicleNumber) &&
    !!draft.emergencyContactName &&
    !!draft.emergencyContactPhone &&
    !!draft.emergencyContactRelationship;

  async function handleSubmit() {
    if (!complete) return;
    setError(null);
    setLoading(true);
    try {
      await submitRiderApplication({
        fullName: draft.fullName,
        dateOfBirth: draft.dateOfBirth,
        homeAddress: composeAddress(draft),
        aadhaarNumber: draft.aadhaarNumber,
        aadhaarPhotoUrl: draft.aadhaarPhotoUrl!,
        dlNumber: draft.dlNumber,
        dlPhotoUrl: draft.dlPhotoUrl!,
        vehicleType: draft.vehicleType!,
        vehicleNumber: draft.vehicleNumber || undefined,
        emergencyContactName: draft.emergencyContactName,
        emergencyContactPhone: draft.emergencyContactPhone,
        emergencyContactRelationship: draft.emergencyContactRelationship,
      });
      setApplicationSubmitted(true);
    } catch (err) {
      // A 401 means the stored session is stale — clear it and let
      // RootNavigator drop back to Login, same as the partner review step.
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Taking you back to log in…');
        setTimeout(() => void clearSession(), 1500);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const dobParts = splitDob(draft.dateOfBirth);
  const dobDisplay = dobParts.year ? `${dobParts.day}/${dobParts.month}/${dobParts.year}` : '';

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <StatusBar style="dark" />
      <View className="flex-row items-center px-5 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={16} className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <WizardProgress step={WIZARD_TOTAL_STEPS} total={WIZARD_TOTAL_STEPS} />
        <View className="h-9 w-9" />
      </View>

      {/* Only the top bar is fixed — the "Almost there" title scrolls with
          the summary rows, same as the wizard's form steps. */}
      <ScrollView className="flex-1" contentContainerClassName="gap-1 px-6 pb-6 pt-4">
        <View className="mb-2">
          <Text className="text-[26px] font-bold text-ink">Almost there</Text>
          <Text className="mt-1 text-[15px] font-medium text-ink/60">We&rsquo;ll review your details and get back to you shortly.</Text>
        </View>

        <SectionLabel label="Personal" />
        <Row label="Full name" value={draft.fullName} onEdit={() => navigation.navigate('PersonalDetails', { draft })} />
        <Row label="Date of birth" value={dobDisplay} onEdit={() => navigation.navigate('PersonalDetails', { draft })} />
        <Row label="Home address" value={isAddressComplete(draft) ? composeAddress(draft) : ''} onEdit={() => navigation.navigate('PersonalDetails', { draft })} />

        <SectionLabel label="Identity" />
        <Row label="Aadhaar number" value={draft.aadhaarNumber} onEdit={() => navigation.navigate('IdentityVerification', { draft })} />
        <Row label="Aadhaar photo" value={draft.aadhaarPhotoUrl ? 'Uploaded' : ''} onEdit={() => navigation.navigate('IdentityVerification', { draft })} />
        <Row label="Licence number" value={draft.dlNumber} onEdit={() => navigation.navigate('IdentityVerification', { draft })} />
        <Row label="Licence photo" value={draft.dlPhotoUrl ? 'Uploaded' : ''} onEdit={() => navigation.navigate('IdentityVerification', { draft })} />

        <SectionLabel label="Vehicle" />
        <Row
          label="Vehicle type"
          value={draft.vehicleType ? VEHICLE_LABEL[draft.vehicleType] : ''}
          onEdit={() => navigation.navigate('VehicleDetails', { draft })}
        />
        <Row
          label="Registration number"
          value={draft.vehicleType === 'bicycle' ? 'Not applicable' : draft.vehicleNumber}
          onEdit={() => navigation.navigate('VehicleDetails', { draft })}
        />

        <SectionLabel label="Emergency contact" />
        <Row label="Name" value={draft.emergencyContactName} onEdit={() => navigation.navigate('EmergencyContact', { draft })} />
        <Row label="Phone" value={draft.emergencyContactPhone} onEdit={() => navigation.navigate('EmergencyContact', { draft })} />
        <Row label="Relationship" value={draft.emergencyContactRelationship} onEdit={() => navigation.navigate('EmergencyContact', { draft })} />

        {error && <Text className="mt-3 text-[13px] font-medium text-danger">{error}</Text>}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton label="Submit for Approval" onPress={handleSubmit} loading={loading} disabled={!complete} trailingIcon={ArrowRight01Icon} tone="blue" />
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  // Generous top space so each section header (Identity, Vehicle, Emergency)
  // clearly separates from the row above instead of crowding its divider.
  return <Text className="mb-2 mt-8 text-[12px] font-bold uppercase tracking-wide text-ink/35 first:mt-2">{label}</Text>;
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/5 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
        <Text className="mt-0.5 text-[16px] font-semibold text-ink" numberOfLines={2}>
          {value.length > 0 ? value : '—'}
        </Text>
      </View>
      <Pressable
        onPress={onEdit}
        hitSlop={10}
        className="rounded-full bg-[#EEF3FF] px-4 py-1.5"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text className="text-[13px] font-bold" style={{ color: '#1447E6' }}>
          Edit
        </Text>
      </Pressable>
    </View>
  );
}
