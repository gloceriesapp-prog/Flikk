// One size's stock/price/quantity card — full-width now that this lives on
// its own screen instead of a bottom sheet, same segmented Available/Out
// toggle and dashed optional-quantity field as before.

import { Pressable, Text, TextInput, View } from 'react-native';
import { Delete02Icon, PackageIcon, RupeeIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { ProductVariant } from '../../catalog/data';

interface Props {
  variant: ProductVariant;
  canRemove: boolean;
  onToggleStock: (isInStock: boolean) => void;
  onChangePrice: (text: string) => void;
  onChangeMrp: (text: string) => void;
  onChangeQuantity: (text: string) => void;
  onRemove: () => void;
}

export function ProductVariantCard({ variant, canRemove, onToggleStock, onChangePrice, onChangeMrp, onChangeQuantity, onRemove }: Props) {
  return (
    <View className="gap-3 rounded-3xl bg-[#F9FAFB] p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-medium text-black">{variant.label}</Text>
          {/* Removing a size back below one variant would leave the
              product unsellable — hidden rather than disabled so it
              doesn't read as a broken button. */}
          {canRemove && (
            <Pressable onPress={onRemove} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
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

      <View className="flex-row items-center rounded-2xl border border-black/10 bg-white px-4 py-3">
        <AppIcon
          icon={RupeeIcon}
          size={15}
          color={colors.ink}
        />
        <TextInput
          value={String(variant.price)}
          onChangeText={onChangePrice}
          keyboardType="number-pad"
          className="ml-2 flex-1 p-0 text-base font-semibold text-ink"
          style={{
            height: 24,
            paddingVertical: 0,
            marginTop: -2,
            textAlignVertical: 'center',
          }}
        />

        <Text className="ml-2 text-sm font-medium text-ink/40">
          per {variant.label}
        </Text>
      </View>

      {/* MRP — optional: an empty field means "no MRP set", not zero.
          Auto-suggested per category the moment a price is entered here
          (see AddProductScreen/ProductDetailScreen's own onChangePrice),
          but a founder can always clear or overwrite it — dashed border
          matches the same "optional field" convention the stock count
          below already uses. */}
      <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white px-4 py-3">
        <AppIcon icon={RupeeIcon} size={15} color={`${colors.ink}60`} />
        <TextInput
          value={variant.originalPrice === undefined ? '' : String(variant.originalPrice)}
          onChangeText={onChangeMrp}
          keyboardType="number-pad"
          placeholder="MRP (optional)"
          placeholderTextColor={`${colors.ink}60`}
          className="flex-1 text-base font-medium text-ink"
        />
      </View>

      {/* Stock count — optional: an empty field means "not tracked", not
          zero units, so a shop owner who doesn't count stock isn't forced
          to fake a number. Dashed border reads as the optional field next
          to the solid-bordered required price above it. */}
      <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white px-4 py-3">
        <AppIcon icon={PackageIcon} size={15} color={`${colors.ink}60`} />
        <TextInput
          value={variant.stockQuantity === undefined ? '' : String(variant.stockQuantity)}
          onChangeText={onChangeQuantity}
          keyboardType="number-pad"
          placeholder="Stock count (optional)"
          placeholderTextColor={`${colors.ink}60`}
          className="flex-1 text-base font-medium text-ink"
        />
        {variant.stockQuantity !== undefined && <Text className="text-xs font-medium text-ink/40">units left</Text>}
      </View>
    </View>
  );
}
