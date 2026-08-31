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
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function FilterChipRow({ value, onChange, counts }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
      {FILTERS.map((filter) => {
        const isActive = filter.id === value;
        return (
          <Pressable
            key={filter.id}
            onPress={() => onChange(filter.id)}
            className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${isActive ? 'bg-ink' : 'bg-white border border-gray-100'}`}
          >
            <Text className={`text-[13px] font-bold ${isActive ? 'text-white' : 'text-ink/60'}`}>{filter.label}</Text>
            <Text
              className={`text-[11px] font-bold ${isActive ? 'text-white/70' : 'text-ink/35'}`}
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
