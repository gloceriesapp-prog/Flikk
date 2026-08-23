// "Delivery Tip" white card below CartScreen's items card — a row of chips
// (₹10 / ₹20 "Most tipped" / ₹30 / Other). Selection lives in CartScreen
// (lifted up, not local state here) because BillDetailsCard's "Delivery
// Partner Tip" line and the To Pay total both need to know what's selected.
//
// "Other" is a chip like the rest, not a real custom-amount entry flow — no
// amount-input modal is built here, same convention as this app's other
// UI-exists-but-the-real-flow-isn't-built pieces (ProductCard's bookmark,
// CartBar's share icon). Selecting it just marks itself selected and
// contributes ₹0, rather than shipping a half-built numeric input.

import { Pressable, Text, View } from 'react-native';

export const TIP_PRESETS = [10, 20, 30] as const;
const MOST_TIPPED_AMOUNT = 20;

export type TipSelection = (typeof TIP_PRESETS)[number] | 'other' | null;

interface Props {
  selectedTip: TipSelection;
  onSelectTip: (tip: TipSelection) => void;
}

export function DeliveryTipCard({ selectedTip, onSelectTip }: Props) {
  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink/50">For your rider</Text>
      <Text className="text-sm leading-5 text-ink/60">
     Your rider dealt with real traffic, heat and distance to get this to you. A small tip is a simple way to say thanks.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {TIP_PRESETS.map((amount) => {
          const isSelected = selectedTip === amount;
          return (
            <Pressable
              key={amount}
              onPress={() => onSelectTip(isSelected ? null : amount)}
              className={`min-w-[76px] items-center gap-1 rounded-xl border px-4 py-2.5 ${
                isSelected ? 'border-lime-deep bg-lime-soft' : 'border-gray-200 bg-[#F9FAFB]'
              }`}
            >
              <Text className={`text-[15px] font-medium ${isSelected ? 'text-lime-deep' : 'text-ink'}`}>₹{amount}</Text>
              {/* {amount === MOST_TIPPED_AMOUNT && (
                <Text className={`text-[10px] font-semibold ${isSelected ? 'text-lime-deep' : 'text-ink/40'}`}>Most tipped</Text>
              )} */}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => onSelectTip(selectedTip === 'other' ? null : 'other')}
          className={`items-center justify-center rounded-xl border px-4 py-2.5 ${
            selectedTip === 'other' ? 'border-lime-deep bg-lime-soft' : 'border-gray-200 bg-[#F9FAFB]'
          }`}
        >
          <Text className={`text-[15px] font-medium ${selectedTip === 'other' ? 'text-lime-deep' : 'text-ink'}`}>Custom</Text>
        </Pressable>
      </View>
    </View>
  );
}
