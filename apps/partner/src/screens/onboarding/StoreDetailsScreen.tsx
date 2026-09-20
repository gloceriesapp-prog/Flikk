// Step 2 of the onboarding wizard — store name, category, store contact
// phone only. Photo and address/map used to live here too (see git history)
// but were split out per an explicit ask to keep each step focused on one
// topic: photo is no longer collected during onboarding at all (added later
// via Store Settings), and location/map moved to its own StoreLocation step.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StoreCategoryPicker } from '../store-settings/components/StoreCategoryPicker';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreDetails'>;

const PAGE_BG = '#F1F2F4';

export function StoreDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [storeName, setStoreName] = useState(draft.storeName);
  const [category, setCategory] = useState(draft.category);
  const [phone, setPhone] = useState(draft.phone);
  const [saving, setSaving] = useState(false);

  const canContinue = storeName.trim().length > 0 && category.length > 0 && phone.trim().length >= 10;

  async function handleNext() {
    if (!canContinue) return;
    const trimmedName = storeName.trim();
    const trimmedPhone = phone.trim();

    setSaving(true);
    try {
      await saveStoreDraft({ storeName: trimmedName, category, phone: trimmedPhone });
    } catch {
      // Best-effort autosave — a failed save just costs a resume, not a
      // blocked flow (fetchStoreDraft's own note in api/auth.ts).
    } finally {
      setSaving(false);
    }

    navigation.navigate('StoreLocation', {
      draft: { ...draft, storeName: trimmedName, category, phone: trimmedPhone },
    });
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <View className="px-6 pb-3 pt-safe-offset-4">
          <Text className="text-[13px] font-bold uppercase tracking-wide text-ink/40">Step 1 of 5</Text>
          <Text className="mt-1 text-[22px] font-semibold text-ink">Store details</Text>
          <Text className="mt-1 text-[14px] font-medium text-ink/55">What&rsquo;s your store called, and how can customers reach it?</Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Store name</Text>
            <TextInput
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Coastal Mart & General Store"
              placeholderTextColor="#9AA5A3"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] font-medium text-ink"
            />
          </View>

          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Category</Text>
            <StoreCategoryPicker selected={category} onSelect={setCategory} />
          </View>

          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Store phone number</Text>
            <TextInput
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit number customers can call"
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              maxLength={10}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] font-medium text-ink"
            />
            <Text className="text-[12px] font-medium text-ink/40">Can be different from your login number.</Text>
          </View>
        </ScrollView>

        <View className="bg-white px-6 pb-safe-offset-4 pt-3">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
