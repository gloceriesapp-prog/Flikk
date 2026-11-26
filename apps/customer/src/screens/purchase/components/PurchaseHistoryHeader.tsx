import { PAGE_TITLE_CLASS_NAME } from '../../../theme/typography';
import { colors } from '../../../theme/tokens';
import { useRef } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { OrderStatusFilter } from './OrderFilterSheet';
import { PurchaseSearchBar } from './PurchaseSearchBar';
import { IconlyArrowLeft } from '../../../components/icons/iconly';

const TABS = [
  { status: 'all', label: 'History' },
  { status: 'on_the_way', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'cancelled', label: 'Cancelled' },
] as const;

interface Props {
  onBack: () => void;
  status: OrderStatusFilter;
  onSelectStatus: (status: OrderStatusFilter) => void;
  search: React.ComponentProps<typeof PurchaseSearchBar> | null;
}

export function PurchaseHistoryHeader({ onBack, status, onSelectStatus, search }: Props) {
  const searchInput = useRef<TextInput>(null);
  const selectedStatus = status === 'failed' ? 'all' : status;

  return (
    <View className="bg-white">
      <View className="flex-row items-center justify-between gap-2 px-3 pb-2 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <IconlyArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className={`${PAGE_TITLE_CLASS_NAME} flex-1 text-ink/90`}>
          Your Orders
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search orders"
          onPress={() => searchInput.current?.focus()}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center"
        >
          <AppIcon icon={Search01Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>

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

      {search && <View className="px-4 pb-3 pt-3"><PurchaseSearchBar {...search} inputRef={searchInput} /></View>}
    </View>
  );
}
