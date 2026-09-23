// Horizontal All/Active/Completed/Cancelled filter — same chip recipe as
// the Store screen's CategoryFilterBar (apps/customer), reused here since
// it's already the established pattern for "one horizontal scroll of
// mutually-exclusive filters" in this codebase. A count badge on each chip
// (not just a bare label) means a rider can tell "anything to look at
// here" before even tapping.

import { ScrollView, Pressable, Text } from 'react-native';

export type DeliveryFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface Props {
  value: DeliveryFilter;
  onChange: (value: DeliveryFilter) => void;
  counts: Record<DeliveryFilter, number>;
}

const FILTERS: { id: DeliveryFilter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

export function FilterChipRow({ value, onChange, counts }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 px-1">
      {FILTERS.map((filter) => {
        const isActive = filter.id === value;
        return (
          <Pressable
            key={filter.id}
            onPress={() => onChange(filter.id)}
            className={`flex-row items-center gap-2 rounded-full px-5 py-2.5 ${isActive ? 'bg-ink' : 'bg-white border border-gray-200'}`}
          >
            <Text className={`text-[14px] font-semibold ${isActive ? 'text-white' : 'text-ink/60'}`}>{filter.label}</Text>
            <Text
              className={`text-[12px] font-bold ${isActive ? 'text-white/80' : 'text-ink/40'}`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {counts[filter.id]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
