import { colors } from '../../../theme/tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconlyHeadphone } from '../../../components/icons/iconly';
import type { OrderStatusFilter } from './OrderFilterSheet';
import { PurchaseSearchBar } from './PurchaseSearchBar';

const TABS = [
  { status: 'all', label: 'History' },
  { status: 'on_the_way', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'cancelled', label: 'Cancelled' },
] as const;

interface Props {
  status: OrderStatusFilter;
  onSelectStatus: (status: OrderStatusFilter) => void;
  search: React.ComponentProps<typeof PurchaseSearchBar> | null;
  onHelp: () => void;
}

export function PurchaseHistoryHeader({ status, onSelectStatus, search, onHelp }: Props) {
  const selectedStatus = status === 'failed' ? 'all' : status;

  return (
    <View className="bg-white">
      <View className="min-h-[55px] flex-row items-center justify-between gap-3 px-4 py-2">
        <Text accessibilityRole="header" className="flex-1 text-[22px] font-bold tracking-tight text-ink">
          Purchase History
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Order help"
          onPress={onHelp}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F3F6] active:bg-[#E5E9EF]"
        >
          <IconlyHeadphone size={19} />
        </Pressable>
      </View>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-1 px-4 pt-1">
        {TABS.map(tab => {
          const selected = selectedStatus === tab.status;
          return (
            <Pressable
              key={tab.status}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectStatus(tab.status)}
              className={`min-h-[44px] justify-center border-b-2 px-2.5 ${selected ? 'border-primary' : 'border-transparent'}`}
            >
              <Text className={`text-[15px] leading-5 ${selected ? 'font-bold text-ink' : 'font-medium text-ink/70'}`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {search && <View className="px-4 pb-3 pt-3"><PurchaseSearchBar {...search} /></View>}
    </View>
  );
}
