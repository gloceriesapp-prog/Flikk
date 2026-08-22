// Step 1 of 3 in the Store Setup wizard — only reached when
// OtpVerificationScreen's verify response says has_store: false. Just the
// two fields that don't need a full-screen flow of their own (name,
// category); photo/location/GST live on StoreDetailsScreen next, and the
// actual submit happens on StoreReviewScreen after that — see
// navigation/types.ts's StoreDraft for how state threads across all three.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StoreCategoryPicker } from '../store-settings/components/StoreCategoryPicker';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreSetup'>;

export function StoreSetupScreen({ navigation }: Props) {
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');

  const canContinue = storeName.trim().length > 0 && category.length > 0;

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('StoreDetails', {
      draft: {
        storeName: storeName.trim(),
        category,
        district: null,
        coordinates: null,
        photoUrl: null,
        gstNumber: '',
      },
    });
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="px-6 pt-4">
        <Text className="text-xs font-bold uppercase tracking-wide text-lime-deep">Step 1 of 3</Text>
        <Text className="mt-1 text-3xl font-medium text-ink">Let’s get your store ready</Text>
        <Text className="mt-1 text-base font-medium text-ink/60">Tell us your store’s name and what it sells.</Text>
      </View>

      <View className="flex-1 gap-5 px-6 pt-6">
        <View className="gap-1.5">
          <Text className="text-base font-medium text-ink/60">Store name</Text>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            placeholder="e.g. Ganesh Kirana Store"
            placeholderTextColor="#9AA5A3"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-medium text-ink"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-base font-medium text-ink/60">Category</Text>
          <StoreCategoryPicker selected={category} onSelect={setCategory} />
        </View>
      </View>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} />
      </View>
    </View>
  );
}
