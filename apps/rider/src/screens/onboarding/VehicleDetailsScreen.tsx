// Page 4 — Vehicle Details. Vehicle type, plus a registration number for a
// motorized vehicle (a bicycle has no plate — the backend's own
// validateSubmission only requires the number for scooter/motorcycle).
// All of this is editable later from the Profile tab, per the spec.

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveRiderDraft } from '../../api/onboarding';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList, RiderDraft } from '../../navigation/types';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';

type Props = NativeStackScreenProps<AuthStackParamList, 'VehicleDetails'>;
type VehicleType = NonNullable<RiderDraft['vehicleType']>;

const OPTIONS: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'bicycle', label: 'Bicycle', emoji: '🚲' },
  { value: 'scooter', label: 'Scooter', emoji: '🛵' },
  { value: 'motorcycle', label: 'Motorcycle', emoji: '🏍️' },
];

export function VehicleDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(draft.vehicleType);
  const [vehicleNumber, setVehicleNumber] = useState(draft.vehicleNumber);
  const [saving, setSaving] = useState(false);

  const needsNumber = vehicleType !== null && vehicleType !== 'bicycle';
  const canContinue = vehicleType !== null && (!needsNumber || vehicleNumber.trim().length > 0);

  async function handleNext() {
    if (!canContinue || !vehicleType) return;
    // A bicycle carries no plate — never persist a stray number for it.
    const number = needsNumber ? vehicleNumber.trim() : '';
    const next = { ...draft, vehicleType, vehicleNumber: number };
    setSaving(true);
    try {
      await saveRiderDraft({ vehicleType, vehicleNumber: number || undefined });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }
    navigation.navigate('EmergencyContact', { draft: next });
  }

  return (
    <OnboardingScaffold
      step={3}
      title="What are you riding?"
      subheading="So we can match you with deliveries near you."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} tone="blue" />}
    >
      <FieldCard label="Vehicle type">
        <View className="gap-2.5">
          {OPTIONS.map((opt) => {
            const selected = vehicleType === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setVehicleType(opt.value)}
                className={`flex-row items-center gap-3 rounded-2xl border px-5 py-4 ${selected ? 'border-[#1447E6] bg-[#EEF3FF]' : 'border-transparent bg-[#EEF0F2]'}`}
              >
                <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                <Text className="text-[15px] font-semibold text-ink">{opt.label}</Text>
                {selected && (
                  <View className="ml-auto h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#1447E6' }}>
                    <Text className="text-[11px] font-bold text-white">✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </FieldCard>

      {needsNumber && (
        <FieldCard label="Vehicle registration number">
          <TextInput
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="e.g. KA20 AB 1234"
            placeholderTextColor="#9AA5A3"
            autoCapitalize="characters"
            className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
          />
          <Text className="text-[12px] font-medium text-ink/40">You can change this anytime from your profile.</Text>
        </FieldCard>
      )}
    </OnboardingScaffold>
  );
}
