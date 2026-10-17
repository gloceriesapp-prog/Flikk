// Store hours are entered as local IST times, displayed with editable AM/PM,
// and submitted as validated 24-hour HH:mm values.

import { useState } from 'react';
import { normalizeStoreHour } from '../../utils/storeHours';
import { Keyboard, Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { enqueueStoreDraft } from '../../onboarding/draftAutosave';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TimeDigitsInput } from '../store-settings/components/TimeDigitsInput';
import { OnboardingScaffold } from './components/OnboardingScaffold';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreHours'>;

export function StoreHoursScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [openTime, setOpenTime] = useState(draft.openTime);
  const [closeTime, setCloseTime] = useState(draft.closeTime);

  const normalizedOpen = normalizeStoreHour(openTime);
  const normalizedClose = normalizeStoreHour(closeTime);
  const canContinue = !!normalizedOpen && !!normalizedClose;

  function handleNext() {
    if (!normalizedOpen || !normalizedClose) return;

    Keyboard.dismiss();
    enqueueStoreDraft({ openTime: normalizedOpen, closeTime: normalizedClose });

    navigation.navigate('StoreReview', { draft: { ...draft, openTime: normalizedOpen, closeTime: normalizedClose } });
  }

  return (
    <OnboardingScaffold
      step={5}
      title="Store hours"
      subheading="When are you open to take orders?"
      onBack={() => navigation.goBack()}
      footer={<PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} trailingIcon={ArrowRight01Icon} />}
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
        <Text className="text-[12px] font-medium text-ink/40">All hours are in Indian Standard Time (IST). Tap AM or PM to change it.</Text>
      </View>
    </OnboardingScaffold>
  );
}
