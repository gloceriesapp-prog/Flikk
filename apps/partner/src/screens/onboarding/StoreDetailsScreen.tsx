// Step 1 of the onboarding wizard — store name, category, store contact
// phone only. Photo and address/map used to live here too (see git history)
// but were split out per an explicit ask to keep each step focused on one
// topic: photo is no longer collected during onboarding at all (added later
// via Store Settings), and location/map moved to its own StoreLocation step.

import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import { categoryNeedsDrugLicense, StoreCategoryPicker, useStoreCategories } from '../store-settings/components/StoreCategoryPicker';
import { FieldCard, INPUT_CLASS, OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreDetails'>;

export function StoreDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [storeName, setStoreName] = useState(draft.storeName);
  const [category, setCategory] = useState(draft.category);
  const [phone, setPhone] = useState(draft.phone);
  const [drugLicenseNumber, setDrugLicenseNumber] = useState(draft.drugLicenseNumber ?? '');
  const [saving, setSaving] = useState(false);
  const categories = useStoreCategories();
  const needsDrugLicense = categoryNeedsDrugLicense(categories, category);
  const isKnownCategory = categories.some((option) => option.name === category);

  const canContinue =
    storeName.trim().length > 0 && isKnownCategory && phone.trim().length >= 10 && (!needsDrugLicense || drugLicenseNumber.trim().length > 0);

  async function handleNext() {
    if (!canContinue) return;
    const trimmedName = storeName.trim();
    const trimmedPhone = phone.trim();
    const trimmedLicense = needsDrugLicense ? drugLicenseNumber.trim() : '';

    setSaving(true);
    try {
      await saveStoreDraft({ storeName: trimmedName, category, phone: trimmedPhone, drugLicenseNumber: trimmedLicense });
    } catch {
      // Best-effort autosave — a failed save just costs a resume, not a
      // blocked flow (fetchStoreDraft's own note in api/auth.ts).
    } finally {
      setSaving(false);
    }

    navigation.navigate('StoreLocation', {
      draft: { ...draft, storeName: trimmedName, category, phone: trimmedPhone, drugLicenseNumber: trimmedLicense },
    });
  }

  return (
    <OnboardingScaffold
      step={1}
      title="Store details"
      subheading="What's your store called, and how can customers reach it?"
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />}
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
