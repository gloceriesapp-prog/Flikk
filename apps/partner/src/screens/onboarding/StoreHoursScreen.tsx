// Step 5 of 5 — opening/closing time, same free-text "9:00 AM"/"9:00 PM"
// shape stores.open_time/close_time already use (TimeDigitsInput, reused
// from Store Settings). One pair for every day — no same-every-day/per-day
// toggle: stores.open_time/close_time has no per-day schema anywhere in the
// app, so a toggle here would be fake functionality with nothing behind it.

import { useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { saveStoreDraft } from '../../api/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TimeDigitsInput } from '../store-settings/components/TimeDigitsInput';
import { OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreHours'>;

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
    <OnboardingScaffold
      step={5}
      title="Store hours"
      subheading="When are you open to take orders?"
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} trailingIcon={ArrowRight01Icon} />}
    >
      <View className="gap-2.5">
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text className="text-[15px] font-semibold text-ink/80">Opens</Text>
            <TimeDigitsInput value={openTime} onChangeText={setOpenTime} suffix="AM" />
          </View>
          <View className="flex-1 gap-1.5">
            <Text className="text-[15px] font-semibold text-ink/80">Closes</Text>
            <TimeDigitsInput value={closeTime} onChangeText={setCloseTime} suffix="PM" />
          </View>
        </View>
        <Text className="text-[12px] font-medium text-ink/40">Same hours every day — you can fine-tune this later in Store Settings.</Text>
      </View>
    </OnboardingScaffold>
  );
}
