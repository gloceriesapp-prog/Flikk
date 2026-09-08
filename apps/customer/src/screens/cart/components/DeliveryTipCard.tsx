// "Thank your rider" card — a row of chips (₹20 "Popular pick" / ₹30 / ₹50 /
// Custom), all four sharing the row equally (flex-1, not flex-wrap) so
// they always sit on one line regardless of screen width — this used to
// wrap "Custom" onto its own row on standard phone widths. Selection lives
// in CartScreen (lifted up, not local state here) because BillDetailsCard's
// tip line and its own Total payable both need to know what's selected.
//
// Presets (₹20/₹30/₹50) match what Indian delivery apps actually show —
// ₹20 is the realistic "most tipped" default here, not an arbitrary pick.
// No emoji, no icon badge — plain text/number chips, kept small and quiet
// since this card sits between two much more important ones (items,
// Price breakdown).
//
// "Custom" is a chip like the rest, not a real custom-amount entry flow —
// no amount-input modal is built here, same convention as this app's other
// UI-exists-but-the-real-flow-isn't-built pieces (ProductCard's bookmark,
// CartBar's share icon). Selecting it just marks itself selected and
// contributes ₹0, rather than shipping a half-built numeric input.

import { Tick02Icon } from '@hugeicons/core-free-icons';
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
    <View className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-black/5">
      <View className="gap-3 px-5 pt-5 pb-4">
        <View className="gap-0.5">
          <Text className="text-[15px] font-semibold text-ink">Thank your rider</Text>
          <Text className="text-[11.5px] leading-[16px] text-ink/50 font-medium">
            100% of your tip goes straight to them.
          </Text>
        </View>

        <View className="flex-row items-stretch gap-2">
          {TIP_PRESETS.map((amount) => {
            const isSelected = selectedTip === amount;
            const isPopular = amount === POPULAR_TIP_AMOUNT;
            return (
              <Pressable
                key={amount}
                onPress={() => onSelectTip(isSelected ? null : amount)}
                className="flex-1 items-center overflow-hidden rounded-2xl border"
                style={{
                  borderColor: isSelected ? TIP_ACCENT : '#E5E7EB',
                  backgroundColor: isSelected ? `${TIP_ACCENT}0F` : '#F9FAFB',
                }}
              >
                <View className="flex-1 items-center justify-center px-2 py-2">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[12px] font-semibold" style={{ color: isSelected ? TIP_ACCENT : '#101C10' }}>
                      ₹{amount}
                    </Text>
                    {isSelected ? <AppIcon icon={Tick02Icon} size={10} color={TIP_ACCENT} /> : null}
                  </View>
                </View>
                {isPopular ? (
                  <View className="w-full items-center py-0.5" style={{ backgroundColor: TIP_ACCENT }}>
                    <Text className="text-[9px] font-semibold uppercase tracking-wide text-white" numberOfLines={1}>
                      Popular
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => onSelectTip(selectedTip === 'other' ? null : 'other')}
            className="flex-1 items-center justify-center rounded-2xl border px-2 py-2"
            style={{
              borderColor: selectedTip === 'other' ? TIP_ACCENT : '#E5E7EB',
              backgroundColor: selectedTip === 'other' ? `${TIP_ACCENT}0F` : '#F9FAFB',
            }}
          >
            <View className="flex-row items-center gap-1">
              <Text className="text-[12px] font-semibold" style={{ color: selectedTip === 'other' ? TIP_ACCENT : '#101C10' }}>
                Custom
              </Text>
              {selectedTip === 'other' ? <AppIcon icon={Tick02Icon} size={10} color={TIP_ACCENT} /> : null}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
