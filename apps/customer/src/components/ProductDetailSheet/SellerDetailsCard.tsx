import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Product } from '../../screens/home/products/types';

interface Props {
  sellerDetails: NonNullable<Product['sellerDetails']>;
}

export function SellerDetailsCard({ sellerDetails }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSellerDetails = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <View className="px-4">
      {/* Header */}
      <Pressable
        onPress={toggleSellerDetails}
        accessibilityRole="button"
        accessibilityLabel="Seller details"
        accessibilityState={{ expanded: isExpanded }}
        hitSlop={8}
        className="flex-row items-center justify-between py-4"
      >
        <View className="flex-1 pr-4">
          <Text className="text-[16px] font-bold text-ink">
            Seller Details
          </Text>

          {!isExpanded && (
            <Text className="mt-0.5 text-[12px] leading-4 text-muted">
              FSSAI licence & seller information
            </Text>
          )}
        </View>

        {/* Plus / Minus button */}
        <View
          className="
            h-8 w-8
            items-center justify-center
            rounded-full
            border border-gray-200
            bg-gray-50
          "
        >
          <Text className="text-[22px] font-normal leading-[24px] text-ink">
            {isExpanded ? '−' : '+'}
          </Text>
        </View>
      </Pressable>

      {/* Expanded Details */}
      {isExpanded && (
        <View className="pb-5">
          {/* Seller Name */}
          <View className="border-b border-gray-100 py-3">
            <Text className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
              Seller
            </Text>

            <Text className="text-[14px] font-semibold leading-5 text-ink">
              {sellerDetails.name}
            </Text>
          </View>

          {/* FSSAI */}
          <View className="border-b border-gray-100 py-3">
            <Text className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
              FSSAI Licence Number
            </Text>

            <Text
              selectable
              className="text-[14px] font-semibold leading-5 text-ink"
            >
              {sellerDetails.fssaiNumber}
            </Text>
          </View>

          {/* Address */}
          <View className="pt-3">
            <Text className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
              Registered Address
            </Text>

            <Text className="text-[14px] font-medium leading-[21px] text-ink/70">
              {sellerDetails.address}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}