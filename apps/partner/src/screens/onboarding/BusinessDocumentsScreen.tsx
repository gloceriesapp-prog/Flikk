// Step 4 of 5 — PAN (required, real format check), GST (optional), Udyam
// registration number (optional). FSSAI/Shop & Establishment license are
// still real, storable fields (StoreDraft's own note) but are no longer
// collected in the wizard — only editable later in Store Settings.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import { isValidPanFormat } from '../../utils/documentValidation';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessDocuments'>;

export function BusinessDocumentsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [panNumber, setPanNumber] = useState(draft.panNumber);
  const [gstNumber, setGstNumber] = useState(draft.gstNumber);
  const [udyamNumber, setUdyamNumber] = useState(draft.udyamNumber);
  const [saving, setSaving] = useState(false);

  const panValid = isValidPanFormat(panNumber);
  const canContinue = panValid;

  async function handleNext() {
    if (!canContinue) return;
    const trimmedPan = panNumber.trim().toUpperCase();
    const trimmedGst = gstNumber.trim();
    const trimmedUdyam = udyamNumber.trim();

    setSaving(true);
    try {
      await saveStoreDraft({ panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }

    navigation.navigate('StoreHours', {
      draft: { ...draft, panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam },
    });
  }

  return (
    <OnboardingScaffold
      step={4}
      title="Business documents"
      subheading="Only PAN is required — no document upload needed."
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />}
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
    </OnboardingScaffold>
  );
}
