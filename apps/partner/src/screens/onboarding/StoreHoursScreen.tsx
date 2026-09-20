// Step 5 of 5 — opening/closing time, same free-text "9:00 AM"/"9:00 PM"
// shape stores.open_time/close_time already use (TimeDigitsInput, reused
// from Store Settings). One pair for every day — no same-every-day/per-day
// toggle: stores.open_time/close_time has no per-day schema anywhere in the
// app, so a toggle here would be fake functionality with nothing behind it.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { ArrowRight01Icon, Time04Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TimeDigitsInput } from '../store-settings/components/TimeDigitsInput';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreHours'>;

const PAGE_BG = '#F1F2F4';

export function StoreHoursScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [openTime, setOpenTime] = useState(draft.openTime);
  const [closeTime, setCloseTime] = useState(draft.closeTime);
  const [saving, setSaving] = useState(false);

  const canContinue = openTime.length > 0 && closeTime.length > 0;

  async function handleNext() {
    if (!canContinue) return;
    setSaving(true);
    try {
      await saveStoreDraft({ openTime, closeTime });
    } catch {
      // Best-effort autosave.
    } finally {
      setSaving(false);
    }

    navigation.navigate('StoreReview', { draft: { ...draft, openTime, closeTime } });
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <View className="px-6 pb-3 pt-safe-offset-4">
          <Text className="text-[13px] font-bold uppercase tracking-wide text-ink/40">Step 5 of 5</Text>
          <Text className="mt-1 text-[22px] font-semibold text-ink">Store hours</Text>
          <Text className="mt-1 text-[14px] font-medium text-ink/55">When are you open to take orders?</Text>
        </View>

        <View className="flex-1 gap-4 px-5">
          <View className="gap-3.5 rounded-[16px] bg-white p-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={Time04Icon} size={16} color={colors.ink} />
              <Text className="text-[15px] font-semibold text-ink/85">Opening hours</Text>
            </View>

            <View className="flex-row gap-3 border-t border-black/5 pt-3.5">
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/50">Opens</Text>
                <TimeDigitsInput value={openTime} onChangeText={setOpenTime} suffix="AM" />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/50">Closes</Text>
                <TimeDigitsInput value={closeTime} onChangeText={setCloseTime} suffix="PM" />
              </View>
            </View>
            <Text className="text-[12px] font-medium text-ink/40">Same hours every day — you can fine-tune this later in Store Settings.</Text>
          </View>
        </View>

        <View className="bg-white px-6 pb-safe-offset-4 pt-3">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
