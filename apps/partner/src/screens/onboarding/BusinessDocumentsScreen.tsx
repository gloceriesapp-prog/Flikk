// Step 4 of 5 — PAN (required, real format check), GST (optional), Udyam
// registration number (optional). FSSAI/Shop & Establishment license are
// still real, storable fields (StoreDraft's own note) but are no longer
// collected in the wizard — only editable later in Store Settings.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon, File01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { isValidPanFormat } from '../../utils/documentValidation';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessDocuments'>;

const PAGE_BG = '#F1F2F4';

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
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <View className="px-6 pb-3 pt-safe-offset-4">
          <Text className="text-[13px] font-bold uppercase tracking-wide text-ink/40">Step 4 of 5</Text>
          <Text className="mt-1 text-[22px] font-semibold text-ink">Business documents</Text>
          <Text className="mt-1 text-[14px] font-medium text-ink/55">Only PAN is required — no document upload needed.</Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
          <View className="gap-3.5 rounded-[16px] bg-white p-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={File01Icon} size={16} color={colors.ink} />
              <Text className="text-[15px] font-semibold text-ink/85">Documents</Text>
            </View>

            <View className="gap-1.5 border-t border-black/5 pt-3.5">
              <View className="flex-row items-center gap-1">
                <Text className="text-[13px] font-medium text-ink/50">PAN number</Text>
                <Text className="text-[15px] font-bold text-danger leading-none">*</Text>
              </View>
              <TextInput
                value={panNumber}
                onChangeText={setPanNumber}
                placeholder="e.g. ABCDE1234F"
                placeholderTextColor="#9AA5A3"
                autoCapitalize="characters"
                maxLength={10}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-ink"
              />
              {panNumber.length > 0 && !panValid && (
                <Text className="text-[12px] font-medium text-danger">Format should be ABCDE1234F.</Text>
              )}
              <Text className="text-[12px] font-medium text-ink/40">Required for payout tax compliance.</Text>
            </View>

            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/50">GST number (optional)</Text>
              <TextInput
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="Add later if you don't have one yet"
                placeholderTextColor="#9AA5A3"
                autoCapitalize="characters"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/50">Udyam registration number (optional)</Text>
              <TextInput
                value={udyamNumber}
                onChangeText={setUdyamNumber}
                placeholder="Add later if you don't have one yet"
                placeholderTextColor="#9AA5A3"
                autoCapitalize="characters"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>
          </View>
        </ScrollView>

        <View className="bg-white px-6 pb-safe-offset-4 pt-3">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
