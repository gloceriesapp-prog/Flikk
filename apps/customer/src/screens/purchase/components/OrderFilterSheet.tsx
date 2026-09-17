// Bottom sheet opened by PurchaseSearchBar's Filter button — two real,
// independent filters, not one combined picker: Order status (a real
// subset of orders.status — 'placed'/'packed' are folded out since
// nobody filters their history by those, only by the states that matter
// once an order's out the door) and Order time (Last 30 days, then one
// entry per calendar year back to the account's own real creation year —
// PurchaseScreen fetches that from GET /auth/me's created_at, not a
// hardcoded lookback window, so a brand-new account only ever sees "Last
// 30 days" + the current year, never a fabricated 2023/2022/... it
// couldn't possibly have orders in).
//
// No real "Returned" order state exists anywhere in this schema
// (orders.status per backend/migrations/001_init.sql) — a cancelled order
// is the closest real terminal state, so that's what's offered here
// rather than a filter option that could never match a real row.

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type OrderStatusFilter = 'all' | 'on_the_way' | 'delivered' | 'cancelled';
// 'all' | 'last_30_days' | a real calendar year (2026, 2025, ...).
export type OrderTimeFilter = 'all' | 'last_30_days' | number;

const STATUS_OPTIONS: { value: OrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'All orders' },
  { value: 'on_the_way', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// currentYear down to accountCreatedYear, inclusive — a fresh account
// (created this year) gets exactly one year entry, never a longer list
// than it could actually have orders in.
function buildYearOptions(accountCreatedYear: number): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= accountCreatedYear; year--) years.push(year);
  return years;
}

interface Props {
  visible: boolean;
  statusValue: OrderStatusFilter;
  timeValue: OrderTimeFilter;
  accountCreatedYear: number;
  onSelectStatus: (value: OrderStatusFilter) => void;
  onSelectTime: (value: OrderTimeFilter) => void;
  onClose: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="px-5 pb-2 pt-5 text-[13px] font-semibold uppercase tracking-wide text-ink/40">{children}</Text>;
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3.5 px-5 py-3.5">
      <Text className="flex-1 text-[15px] font-medium text-ink">{label}</Text>
      {selected && <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />}
    </Pressable>
  );
}

export function OrderFilterSheet({ visible, statusValue, timeValue, accountCreatedYear, onSelectStatus, onSelectTime, onClose }: Props) {
  const yearOptions = buildYearOptions(accountCreatedYear);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()} style={{ maxHeight: '80%' }}>
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-gray-200" />
          </View>
          <Text className="px-5 pt-3 text-lg font-semibold text-ink">Filter orders</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <SectionLabel>Order status</SectionLabel>
            {STATUS_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                selected={statusValue === option.value}
                onPress={() => onSelectStatus(option.value)}
              />
            ))}

            <SectionLabel>Order time</SectionLabel>
            <OptionRow label="All time" selected={timeValue === 'all'} onPress={() => onSelectTime('all')} />
            <OptionRow label="Last 30 days" selected={timeValue === 'last_30_days'} onPress={() => onSelectTime('last_30_days')} />
            {yearOptions.map((year) => (
              <OptionRow key={year} label={String(year)} selected={timeValue === year} onPress={() => onSelectTime(year)} />
            ))}
          </ScrollView>

          <View className="flex-row gap-3 px-5 pb-3 pt-4">
            <Pressable
              onPress={() => {
                onSelectStatus('all');
                onSelectTime('all');
              }}
              className="flex-1 items-center rounded-2xl border border-gray-200 py-3.5"
            >
              <Text className="text-[15px] font-semibold text-ink">Clear all</Text>
            </Pressable>
            <Pressable onPress={onClose} className="flex-1 items-center rounded-2xl py-3.5" style={{ backgroundColor: colors.ink }}>
              <Text className="text-[15px] font-semibold text-white">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
