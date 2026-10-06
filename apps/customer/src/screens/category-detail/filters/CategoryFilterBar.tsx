import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronDownIcon, FilterHorizontalIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { activeFilterCount, SORT_OPTIONS, type FilterPanel, type ProductFilters } from './productFilters';

interface Props {
  filters: ProductFilters;
  onOpen: (panel: FilterPanel) => void;
}

export function CategoryFilterBar({ filters, onOpen }: Props) {
  const count = activeFilterCount(filters);
  const chips = [
    { panel: 'sort' as const, label: SORT_OPTIONS.find((option) => option.value === filters.sort)?.shortLabel ?? 'Sort By', active: filters.sort !== 'recommended' },
    { panel: 'type' as const, label: 'Type', active: Boolean(filters.type) },
    { panel: 'brand' as const, label: 'Brand', active: Boolean(filters.brand) },
  ];
  return (
    <View className="h-[64px] overflow-hidden bg-white">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="h-full items-center gap-2 px-2" contentInsetAdjustmentBehavior="never">
        <Pressable accessibilityRole="button" accessibilityLabel={`Product filters${count ? `, ${count} active` : ''}`} onPress={() => onOpen('all')} className="h-11 min-w-11 flex-row items-center justify-center gap-1 rounded-xl border px-2" style={{ borderColor: count ? '#155DFC' : '#DDDFE3', backgroundColor: count ? '#EFF4FF' : '#FFFFFF' }}>
          <AppIcon icon={FilterHorizontalIcon} size={19} color={count ? '#155DFC' : '#55585D'} strokeWidth={2} />
          {count > 0 && <Text className="text-[11px] font-bold text-[#155DFC]">{count}</Text>}
        </Pressable>
        {chips.map(({ panel, label, active }) => (
          <Pressable key={panel} accessibilityRole="button" accessibilityLabel={`${panel === 'sort' ? 'Sort by' : label}${active ? ', active' : ''}`} onPress={() => onOpen(panel)} className="h-11 flex-row items-center gap-2 rounded-xl border px-3" style={{ borderColor: active ? '#155DFC' : '#DDDFE3', backgroundColor: active ? '#EFF4FF' : '#FFFFFF' }}>
            <Text className="text-[13px] font-medium" style={{ color: active ? '#155DFC' : '#55585D' }}>{label}</Text>
            <AppIcon icon={ChevronDownIcon} size={15} color={active ? '#155DFC' : '#55585D'} strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
