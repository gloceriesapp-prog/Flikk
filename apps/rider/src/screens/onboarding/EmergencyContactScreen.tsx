// Page 5 — Emergency Contact. Name, phone, relationship — all required by
// the backend's own submit validation. Only ever used if we need to reach
// someone during a delivery.

import { useState } from 'react';
import { TextInput } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveRiderDraft } from '../../api/onboarding';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';
import { FieldCard, OnboardingScaffold } from './components/OnboardingScaffold';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmergencyContact'>;

export function EmergencyContactScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [name, setName] = useState(draft.emergencyContactName);
  const [phone, setPhone] = useState(draft.emergencyContactPhone);
  const [relationship, setRelationship] = useState(draft.emergencyContactRelationship);
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim().length > 0 && phone.trim().length >= 10 && relationship.trim().length > 0;

  async function handleNext() {
    if (!canContinue) return;
    const next = {
      ...draft,
      emergencyContactName: name.trim(),
      emergencyContactPhone: phone.trim(),
      emergencyContactRelationship: relationship.trim(),
    };
    setSaving(true);
    try {
      await saveRiderDraft({
        emergencyContactName: next.emergencyContactName,
        emergencyContactPhone: next.emergencyContactPhone,
        emergencyContactRelationship: next.emergencyContactRelationship,
      });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }
    navigation.navigate('ReviewSubmit', { draft: next });
  }

  return (
    <OnboardingScaffold
      step={4}
      title="In case we need to reach someone"
      subheading="Only used in an emergency during a delivery."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} tone="blue" />}
    >
      <FieldCard label="Contact name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Suresh Shetty"
          placeholderTextColor="#9AA5A3"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <FieldCard label="Contact phone number">
        <TextInput
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9+]/g, ''))}
          placeholder="10-digit mobile number"
          placeholderTextColor="#9AA5A3"
          keyboardType="phone-pad"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>

      <FieldCard label="Relationship">
        <TextInput
          value={relationship}
          onChangeText={setRelationship}
          placeholder="e.g. Brother, Spouse, Friend"
          placeholderTextColor="#9AA5A3"
          className="rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink"
        />
      </FieldCard>
    </OnboardingScaffold>
  );
}
