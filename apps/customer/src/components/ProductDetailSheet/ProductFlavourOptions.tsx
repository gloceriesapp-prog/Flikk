// Flavour picker (Product.options): one tile per flavour with its photo.
// Same price for every flavour; the choice is part of the cart line
// (cartLineId) and reaches the store on order_items.option_name_at_order.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { stockLabel } from '../stockLabel';
import type { ProductOption } from '../../screens/home/products/types';

interface Props {
  options: ProductOption[];
  availableQuantity?: number;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ProductFlavourOptions({ options, selectedId, onSelect, availableQuantity }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="gap-2.5">
      <Text className="text-[13px] font-semibold text-ink/60">Choose a flavour</Text>
      <View className="-mx-1 flex-row flex-wrap">
        {(expanded ? options : options.slice(0, 6)).map((option) => {
          const stock = option.availableQuantity == null ? availableQuantity : Math.min(availableQuantity ?? option.availableQuantity, option.availableQuantity);
          const isSelected = option.id === selectedId;
          return (
            <View key={option.id} style={{ width: '33.333333%', paddingHorizontal: 4, marginBottom: 8 }}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: !option.isAvailable }}
                accessibilityLabel={`${option.name}${option.isAvailable ? '' : ', out of stock'}`}
                disabled={!option.isAvailable}
                onPress={() => onSelect(option.id)}
                className="items-center gap-2 rounded-[14px] border p-2"
                style={{ borderColor: isSelected ? '#2457F5' : '#DADADA', backgroundColor: isSelected ? '#F3F6FF' : '#FFFFFF', opacity: option.isAvailable ? 1 : 0.45 }}
              >
                <Image source={{ uri: option.imageUrl || PLACEHOLDER_IMAGE_URI }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="contain" />
                <Text className="min-h-[30px] text-center text-[12px] font-semibold leading-[15px] text-ink" numberOfLines={2}>{option.name}</Text>
                <Text className="min-h-[14px] text-[10px] font-semibold" style={{ color: !option.isAvailable ? '#B42318' : '#2457F5' }}>
                  {!option.isAvailable ? 'Out of stock' : [isSelected ? 'Selected' : '', stockLabel(stock)].filter(Boolean).join(' · ') || ' '}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {!expanded && options.length > 6 ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} className="items-center rounded-xl bg-[#F3F4F5] py-3">
          <Text className="text-[13px] font-semibold text-ink">See all flavours</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
