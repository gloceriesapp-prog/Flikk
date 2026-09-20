// Step 3 of 5 — owner's own full name, their real OTP-verified login phone
// (read-only display, pulled from the account's own session via
// checkAccountStatus), and an optional contact email (writes to users.email).

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { checkAccountStatus, saveStoreDraft } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { formatPhone } from '../../utils/formatPhone';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OwnerDetails'>;

const PAGE_BG = '#F1F2F4';

export function OwnerDetailsScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [ownerName, setOwnerName] = useState(draft.ownerName);
  const [ownerEmail, setOwnerEmail] = useState(draft.ownerEmail);
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleNext() {
    if (!canContinue) return;
    const trimmedName = ownerName.trim();
    const trimmedEmail = ownerEmail.trim();

    setSaving(true);
    try {
      await saveStoreDraft({ ownerName: trimmedName, ownerEmail: trimmedEmail });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }

    navigation.navigate('BusinessDocuments', { draft: { ...draft, ownerName: trimmedName, ownerEmail: trimmedEmail } });
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <View className="px-6 pb-3 pt-safe-offset-4">
          <Text className="text-[13px] font-bold uppercase tracking-wide text-ink/40">Step 3 of 5</Text>
          <Text className="mt-1 text-[22px] font-semibold text-ink">Owner details</Text>
          <Text className="mt-1 text-[14px] font-medium text-ink/55">Who should we contact about this store?</Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Owner full name</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="e.g. Ramesh Shetty"
              placeholderTextColor="#9AA5A3"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] font-medium text-ink"
            />
          </View>

          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Owner phone number</Text>
            <View className="flex-row items-center justify-between rounded-2xl bg-mist px-4 py-3.5">
              <Text className="text-[14px] font-medium text-ink/70">{phone ? formatPhone(phone) : '—'}</Text>
              <View className="flex-row items-center gap-1">
                <AppIcon icon={CheckmarkCircle02Icon} size={14} color={colors.limeDeep} />
                <Text className="text-[12px] font-bold" style={{ color: colors.limeDeep }}>
                  Verified
                </Text>
              </View>
            </View>
            <Text className="text-[12px] font-medium text-ink/40">Your verified login number — change it by signing in with a new one.</Text>
          </View>

          <View className="gap-2 rounded-[16px] bg-white p-4">
            <Text className="text-[13px] font-semibold text-ink/50">Email (optional)</Text>
            <TextInput
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] font-medium text-ink"
            />
          </View>
        </ScrollView>

        <View className="bg-white px-6 pb-safe-offset-4 pt-3">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
