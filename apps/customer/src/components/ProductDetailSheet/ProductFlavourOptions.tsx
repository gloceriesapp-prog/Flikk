// Flavour picker (Product.options): one tile per flavour with its photo.
// Same price for every flavour; the choice is part of the cart line
// (cartLineId) and reaches the store on order_items.option_name_at_order.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { ProductOption } from '../../screens/home/products/types';

interface Props {
  options: ProductOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ProductFlavourOptions({ options, selectedId, onSelect }: Props) {
  return (
    <View className="gap-2.5">
      <Text className="text-[13px] font-semibold text-ink/60">Flavour</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: !option.isAvailable }}
              accessibilityLabel={`${option.name}${option.isAvailable ? '' : ', out of stock'}`}
              disabled={!option.isAvailable}
              onPress={() => onSelect(option.id)}
              className="w-[92px] items-center gap-1.5 rounded-[14px] border p-2"
              style={{ borderColor: isSelected ? '#2457F5' : '#DADADA', backgroundColor: isSelected ? '#F3F6FF' : '#FFFFFF', opacity: option.isAvailable ? 1 : 0.45 }}
            >
              <Image source={{ uri: option.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-14 w-14 rounded-lg" resizeMode="contain" />
              <Text className="text-center text-[12px] font-semibold leading-[15px] text-ink" numberOfLines={2}>{option.name}</Text>
              {!option.isAvailable && <Text className="text-[10px] font-medium text-[#B42318]">Out of stock</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
