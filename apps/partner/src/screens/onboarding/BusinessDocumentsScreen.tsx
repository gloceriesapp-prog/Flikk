// Step 4 of 5 — PAN (required, real format check), FSSAI (required for food
// categories, 14 digits), GST (optional), Udyam registration number
// (optional). Shop & Establishment license is editable later in Store
// Settings. Aadhaar is not collected.

import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { enqueueStoreDraft } from '../../onboarding/draftAutosave';
import { PrimaryButton } from '../../components/PrimaryButton';
import { isValidFssaiFormat, isValidPanFormat } from '../../utils/documentValidation';
import { categoryNeedsFssai, useStoreCategories } from '../store-settings/components/StoreCategoryPicker';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessDocuments'>;

export function BusinessDocumentsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [panNumber, setPanNumber] = useState(draft.panNumber);
  const [gstNumber, setGstNumber] = useState(draft.gstNumber);
  const [udyamNumber, setUdyamNumber] = useState(draft.udyamNumber);
  const [fssaiNumber, setFssaiNumber] = useState(draft.fssaiNumber ?? '');
  const categories = useStoreCategories();
  const needsFssai = categoryNeedsFssai(categories, draft.category);

  const panValid = isValidPanFormat(panNumber);
  const fssaiValid = isValidFssaiFormat(fssaiNumber);
  const canContinue = panValid && (!needsFssai || fssaiValid);

  function handleNext() {
    if (!canContinue) return;
    const trimmedPan = panNumber.trim().toUpperCase();
    const trimmedGst = gstNumber.trim();
    const trimmedUdyam = udyamNumber.trim();
    const trimmedFssai = needsFssai ? fssaiNumber.trim() : draft.fssaiNumber;

    Keyboard.dismiss();
    enqueueStoreDraft({ panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam, fssaiNumber: trimmedFssai || undefined });

    navigation.navigate('StoreHours', {
      draft: { ...draft, panNumber: trimmedPan, gstNumber: trimmedGst, udyamNumber: trimmedUdyam, fssaiNumber: trimmedFssai },
    });
  }

  return (
    <OnboardingScaffold
      step={4}
      title="Business documents"
      subheading={needsFssai ? 'PAN and FSSAI are required for your store.' : 'PAN is required for your store.'}
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

      {needsFssai && (
        <FieldCard label="FSSAI registration or licence number" required>
          <TextInput
            value={fssaiNumber}
            onChangeText={(text) => setFssaiNumber(text.replace(/[^0-9]/g, '').slice(0, 14))}
            placeholder="14-digit number"
            placeholderTextColor="#9AA5A3"
            keyboardType="number-pad"
            maxLength={14}
            className={INPUT_CLASS}
          />
          {fssaiNumber.length > 0 && !fssaiValid && (
            <Text className="text-[12px] font-medium text-danger">Must be exactly 14 digits.</Text>
          )}
          <Text className="text-[12px] font-medium text-ink/40">Required for stores that sell food.</Text>
        </FieldCard>
      )}

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
