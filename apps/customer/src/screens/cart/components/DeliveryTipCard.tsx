// "Delivery Tip" white card below CartScreen's items card — a row of chips
// (₹20 "Popular pick" / ₹30 / ₹50 / Custom), all four sharing the row
// equally (flex-1, not flex-wrap) so they always sit on one line regardless
// of screen width — this used to wrap "Custom" onto its own row on
// standard phone widths. Selection lives in CartScreen (lifted up, not
// local state here) because BillDetailsCard's "Delivery Partner Tip" line
// and the To Pay total both need to know what's selected.
//
// Presets (₹20/₹30/₹50) match what Indian delivery apps actually show —
// ₹20 is the realistic "most tipped" default here, not an arbitrary pick.
//
// "Custom" is a chip like the rest, not a real custom-amount entry flow —
// no amount-input modal is built here, same convention as this app's other
// UI-exists-but-the-real-flow-isn't-built pieces (ProductCard's bookmark,
// CartBar's share icon). Selecting it just marks itself selected and
// contributes ₹0, rather than shipping a half-built numeric input.

import { Scooter01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

export const TIP_PRESETS = [20, 30, 50] as const;
const POPULAR_TIP_AMOUNT = 20;
const TIP_ACCENT = '#155DFC';

export type TipSelection = (typeof TIP_PRESETS)[number] | 'other' | null;

interface Props {
  selectedTip: TipSelection;
  onSelectTip: (tip: TipSelection) => void;
}

export function DeliveryTipCard({ selectedTip, onSelectTip }: Props) {
  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${TIP_ACCENT}14` }}>
          <AppIcon icon={Scooter01Icon} size={18} color={TIP_ACCENT} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-ink">Thank your rider</Text>
          <Text className="text-[12.5px] leading-[17px] text-ink/45">
            They braved the traffic and the weather to get this to you. A tip means a lot to them.
          </Text>
        </View>
      </View>

      <View className="flex-row items-stretch gap-2">
        {TIP_PRESETS.map((amount) => {
          const isSelected = selectedTip === amount;
          const isPopular = amount === POPULAR_TIP_AMOUNT;
          return (
            <Pressable
              key={amount}
              onPress={() => onSelectTip(isSelected ? null : amount)}
              className="flex-1 items-center overflow-hidden rounded-xl border"
              style={{
                borderColor: isSelected ? TIP_ACCENT : '#E5E7EB',
                backgroundColor: isPopular ? '#FFFFFF' : isSelected ? `${TIP_ACCENT}0F` : '#F9FAFB',
              }}
            >
              <View className={`flex-row items-center gap-1 px-2 py-2 ${isPopular ? '' : 'flex-1 justify-center'}`}>
                <Text className="text-[15px] font-medium" style={{ color: isSelected ? TIP_ACCENT : '#101C10' }}>
                  ₹{amount}
                </Text>
                {isSelected ? <AppIcon icon={Tick02Icon} size={11} color={TIP_ACCENT} /> : null}
              </View>
              {isPopular ? (
                <View className="w-full items-center py-1" style={{ backgroundColor: TIP_ACCENT }}>
                  <Text className="text-[10.5px] font-medium text-white" numberOfLines={1}>
                    Popular pick
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => onSelectTip(selectedTip === 'other' ? null : 'other')}
          className="flex-1 items-center justify-center rounded-xl border px-2 py-2"
          style={{
            borderColor: selectedTip === 'other' ? TIP_ACCENT : '#E5E7EB',
            backgroundColor: selectedTip === 'other' ? `${TIP_ACCENT}0F` : '#F9FAFB',
          }}
        >
          <View className="flex-row items-center gap-1">
            <Text className="text-[15px] font-medium" style={{ color: selectedTip === 'other' ? TIP_ACCENT : '#101C10' }}>
              Custom
            </Text>
            {selectedTip === 'other' ? <AppIcon icon={Tick02Icon} size={12} color={TIP_ACCENT} /> : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
