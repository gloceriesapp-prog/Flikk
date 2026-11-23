import { useState } from 'react';
import { isMoneyInput } from '../../../utils/moneyInput';
// One size's stock/price/quantity card — full-width now that this lives on
// its own screen instead of a bottom sheet, same segmented Available/Out
// toggle and dashed optional-quantity field as before.

import { Pressable, Text, TextInput, View } from 'react-native';
import { Delete02Icon, PackageIcon, RupeeIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PACK_UNITS, readPackSize, type ProductVariant } from '../../catalog/data';

interface Props {
  variant: ProductVariant;
  index: number;
  canRemove: boolean;
  stockOptional?: boolean;
  onToggleStock: (isInStock: boolean) => void;
  onChangeSize: (label: string) => void;
  onChangePrice: (text: string) => void;
  onChangeMrp: (text: string) => void;
  onChangeQuantity: (text: string) => void;
  onRemove: () => void;
}

export function ProductVariantCard({ variant, index, canRemove, stockOptional = false, onToggleStock, onChangeSize, onChangePrice, onChangeMrp, onChangeQuantity, onRemove }: Props) {
  const [priceInput, setPriceInput] = useState<string | null>(null);
  const [mrpInput, setMrpInput] = useState<string | null>(null);
  const { quantity, unit } = readPackSize(variant.label) ?? { quantity: '', unit: 'g' };

  return (
    <View className="gap-3 rounded-3xl bg-[#F9FAFB] p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-medium text-black">Size {index + 1}</Text>
          {/* Removing a size back below one variant would leave the
              product unsellable — hidden rather than disabled so it
              doesn't read as a broken button. */}
          {canRemove && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove size ${index + 1}`}
              onPress={onRemove} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <AppIcon icon={Delete02Icon} size={15} color={`${colors.danger}99`} />
            </Pressable>
          )}
        </View>

        {/* Segmented Available / Out of stock — a premium alternative to a
            plain Switch, matches Blinkit/Instamart's per-weight stock
            control: two pill buttons, active one filled solid. */}
        <View className="flex-row rounded-full bg-black/5 p-1">
          <Pressable
            onPress={() => onToggleStock(true)}
            className={`rounded-full px-3 py-1.5 ${variant.isInStock ? 'bg-[#04AA6D]' : ''}`}
          >
            <Text className={`text-sm font-medium ${variant.isInStock ? 'text-white' : 'text-ink/40'}`}>
              Available
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onToggleStock(false)}
            className={`rounded-full px-3 py-1.5 ${!variant.isInStock ? 'bg-danger' : ''}`}
          >
            <Text className={`text-sm font-medium ${!variant.isInStock ? 'text-white' : 'text-ink/40'}`}>
              Out of stock
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink">Pack quantity</Text>
        <TextInput
          accessibilityLabel={`Size ${index + 1} pack quantity`}
          autoFocus={variant.id.startsWith('new-') && quantity === ''}
          placeholder="Enter quantity"
          placeholderTextColor={`${colors.ink}60`}
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={(value) => {
            const normalized = value.replace(',', '.');
            if (/^\d*(?:\.\d*)?$/.test(normalized)) onChangeSize(`${normalized} ${unit}`);
          }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-base text-ink"
        />
        <View className="flex-row flex-wrap gap-2">
          {PACK_UNITS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Unit ${option} for size ${index + 1}`}
              accessibilityState={{ selected: unit === option }}
              onPress={() => onChangeSize(`${quantity} ${option}`)}
              className={`rounded-full border border-black/10 px-3 py-2 ${unit === option ? 'bg-black' : 'bg-white'}`}
            >
              <Text className={unit === option ? 'text-white' : 'text-ink'}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center rounded-2xl border border-black/10 bg-white px-4 py-3">
        <AppIcon
          icon={RupeeIcon}
          size={15}
          color={colors.ink}
        />
        <TextInput
          accessibilityLabel="Store price"
          placeholder="Store price"
          placeholderTextColor={`${colors.ink}60`}
          value={priceInput ?? (variant.price ? String(variant.price) : '')}
          onFocus={() => setPriceInput(variant.price ? String(variant.price) : '')}
          onBlur={() => setPriceInput(null)}
          onChangeText={(value) => { if (isMoneyInput(value)) { setPriceInput(value); onChangePrice(value); } }}
          keyboardType="decimal-pad"
          className="ml-2 flex-1 p-0 text-base font-semibold text-ink"
          style={{
            height: 24,
            paddingVertical: 0,
            marginTop: -2,
            textAlignVertical: 'center',
          }}
        />

        {Number(quantity) > 0 && (
          <Text className="ml-2 text-sm font-medium text-ink/40">per {variant.label}</Text>
        )}
      </View>

      <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white px-4 py-3">
        <AppIcon icon={RupeeIcon} size={15} color={`${colors.ink}60`} />
        <TextInput
          value={mrpInput ?? (variant.originalPrice === undefined ? '' : String(variant.originalPrice))}
          onFocus={() => setMrpInput(variant.originalPrice === undefined ? '' : String(variant.originalPrice))}
          onBlur={() => setMrpInput(null)}
          onChangeText={(value) => { if (isMoneyInput(value)) { setMrpInput(value); onChangeMrp(value); } }}
          keyboardType="decimal-pad"
          placeholder="MRP (optional)"
          placeholderTextColor={`${colors.ink}60`}
          className="flex-1 text-base font-medium text-ink"
        />
      </View>

      <View className="flex-row items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3">
        <AppIcon icon={PackageIcon} size={15} color={`${colors.ink}60`} />
        <TextInput
          value={variant.stockQuantity === undefined ? '' : String(variant.stockQuantity)}
          onChangeText={onChangeQuantity}
          keyboardType="number-pad"
          placeholder={stockOptional ? "Stock count (optional)" : "Stock count (packs)"}
          placeholderTextColor={`${colors.ink}60`}
          className="flex-1 text-base font-medium text-ink"
        />
        {variant.stockQuantity !== undefined && <Text className="text-xs font-medium text-ink/40">packs left</Text>}
      </View>
    </View>
  );
}
