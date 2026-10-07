import { useCallback } from 'react';
import {
  ArrowLeft01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Location04Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../../store/useAuthStore';
import { fetchAddresses, setDefaultAddress, type ApiAddress } from '../../api/addresses';
import { ApiError } from '../../api/client';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddressList'>;

export function AddressListScreen({ navigation }: Props) {
  const customerId = useAuthStore((state) => state.customerId);
  const queryClient = useQueryClient();

  const {
    data: addresses,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['addresses', customerId],
    queryFn: fetchAddresses,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  async function handleSelect(id: string) {
    try {
      await setDefaultAddress(id);

      await queryClient.invalidateQueries({
        queryKey: ['addresses', customerId],
      });

      // Back to whoever opened the address book (Cart or Profile).
      navigation.goBack();
    } catch (err) {
      // The current default stays in place; tell the customer it didn't switch.
      Alert.alert('Could not switch address', err instanceof ApiError ? err.message : 'Please check your connection and try again.');
    }
  }

  function handleEdit(address: ApiAddress) {
    if (address.latitude == null || address.longitude == null) return;
    navigation.navigate('AddressForm', {
      latitude: address.latitude,
      longitude: address.longitude,
      addressLabel: address.line1,
      city: address.label,
      address,
    });
  }

  return (
    <View className="flex-1 bg-[#F4F4F6] pt-safe">
      {/* Header */}
      <View className="relative flex-row items-center px-5 pb-4 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="z-10 h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={20}
            color="#1D1D23"
            strokeWidth={2}
          />
        </Pressable>

        <Text className="absolute left-0 right-0 text-center text-[19px] font-bold text-[#1D1D23]">
          Delivery addresses
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1D1D23" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-8"
        >
          {/* Section title */}
          {/* <Text className="mb-3 ml-1 text-[12px] font-bold uppercase tracking-[1.5px] text-[#8B8B92]">
            Saved addresses
          </Text> */}

          {/* Main white card */}
          <View className="overflow-hidden rounded-[24px] bg-white px-4">
            {(addresses ?? []).map((address, index) => {
              const isLast = index === (addresses?.length ?? 0) - 1;

              return (
                <View key={address.id}>
                  <Pressable
                    onPress={() => handleSelect(address.id)}
                    className="flex-row items-center py-4"
                  >
                    {/* Location icon box */}
                    <View className="mr-3.5 h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-[#ECECF0] bg-[#F5F5F7]">
                      <HugeiconsIcon
                        icon={Location04Icon}
                        size={22}
                        color="#24242B"
                        strokeWidth={1.8}
                      />
                    </View>

                    {/* Address content */}
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className="flex-shrink text-[17px] font-bold text-[#202027]"
                          numberOfLines={1}
                        >
                          {address.label}
                        </Text>

                        {address.is_default && (
                          <View className="ml-2 rounded-full bg-[#F1F1F3] px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-[#696970]">
                              Default
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        className="mt-1 text-[13px] font-medium leading-[18px] text-[#77777E]"
                        numberOfLines={2}
                      >
                        {address.recipient_name} · {address.line1}
                      </Text>

                      {address.landmark ? (
                        <Text
                          className="mt-0.5 text-[12px] leading-[17px] text-[#9A9AA0]"
                          numberOfLines={1}
                        >
                          {address.landmark}
                        </Text>
                      ) : null}
                    </View>

                    {/* Selected indicator */}
                    {address.is_default && (
                      <View className="ml-1">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={19}
                          color="#202027"
                          strokeWidth={2}
                        />
                      </View>
                    )}

                    {address.latitude != null && address.longitude != null && (
                      <Pressable
                        onPress={() => handleEdit(address)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${address.label} address`}
                        className="ml-2 rounded-full bg-[#F1F1F3] px-3 py-1.5"
                      >
                        <Text className="text-[12px] font-semibold text-[#202027]">Edit</Text>
                      </Pressable>
                    )}
                  </Pressable>

                  {/* Divider */}
                  {!isLast && (
                    <View className="ml-[66px] h-px bg-[#E7E7EA]" />
                  )}
                </View>
              );
            })}
          </View>

          {/* Add new address */}
          <Pressable
            onPress={() =>
              navigation.navigate('LocationSearch', {
                intent: 'address-book',
              })
            }
            className="mt-4 flex-row items-center justify-center rounded-[18px] bg-white py-4"
          >
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-[#F1F1F3]">
              <HugeiconsIcon
                icon={Add01Icon}
                size={16}
                color="#202027"
                strokeWidth={2}
              />
            </View>

            <Text className="text-[13px] font-semibold text-[#202027]">
              Add new address
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}