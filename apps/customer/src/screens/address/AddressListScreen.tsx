// The real address book — GET /addresses, tap one to make it default
// (PATCH /addresses/:id/default) and jump back to Checkout with it
// selected, or "+ Add new address" to start the pin -> form flow
// (LocationSearch with intent='address-book'). Reached from Checkout's own
// "Change" affordance on its address card.

import { useCallback } from 'react';
import { ArrowLeft01Icon, Add01Icon, Location01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchAddresses, setDefaultAddress } from '../../api/addresses';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddressList'>;

export function AddressListScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { data: addresses, isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  // Refetch every time this screen regains focus — coming back from
  // AddressForm after saving a new one is exactly that, and there's no
  // shared store to invalidate instead.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  async function handleSelect(id: string) {
    try {
      await setDefaultAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      navigation.navigate('Checkout');
    } catch {
      // Best-effort — a failed default-switch just leaves the previous
      // default in place, no worse off than before the tap.
    }
  }

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>
        <Text className="absolute left-0 right-0 text-center text-lg font-semibold text-ink">Delivery addresses</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-6">
          {(addresses ?? []).map((address) => (
            <Pressable
              key={address.id}
              onPress={() => handleSelect(address.id)}
              className="flex-row items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-mist">
                <AppIcon icon={Location01Icon} size={16} color={colors.ink} />
              </View>
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-ink">{address.label}</Text>
                  {address.is_default && <View className="rounded-full bg-lime-soft px-2 py-0.5"><Text className="text-[11px] font-semibold text-lime-deep">Default</Text></View>}
                </View>
                <Text className="text-sm font-medium text-ink" numberOfLines={2}>
                  {address.recipient_name} · {address.line1}
                </Text>
                {address.landmark && <Text className="text-xs text-ink/50">{address.landmark}</Text>}
              </View>
              {address.is_default && <AppIcon icon={CheckmarkCircle02Icon} size={18} color={colors.limeDeep} />}
            </Pressable>
          ))}

          <Pressable
            onPress={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-4"
          >
            <AppIcon icon={Add01Icon} size={16} color={colors.ink} />
            <Text className="text-sm font-semibold text-ink">Add new address</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
