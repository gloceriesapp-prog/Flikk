// State dropdown for the rider onboarding address — a tap-to-open bottom
// sheet listing every Indian state + union territory, with a quick search
// filter (36 entries is enough to want one). No native picker dependency;
// a plain Modal + FlatList keeps it Expo Go safe and consistent with the
// rest of this app's own sheets.

import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ArrowDown01Icon, Cancel01Icon, Search01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

// 28 states + 8 union territories, alphabetical within each group.
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export function StateSelect({ value, onSelect }: { value: string; onSelect: (state: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDIAN_STATES;
    return INDIAN_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  function pick(state: string) {
    onSelect(state);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-2xl bg-[#EEF0F2] px-5 py-4"
      >
        <Text className={`text-[15px] font-medium ${value ? 'text-ink' : 'text-[#9AA5A3]'}`}>{value || 'Select state'}</Text>
        <AppIcon icon={ArrowDown01Icon} size={18} color={colors.ink} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        {/* Backdrop tap closes; the sheet itself swallows the tap. */}
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[75%] rounded-t-3xl bg-white pt-4" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-5 pb-3">
              <Text className="text-[17px] font-bold text-ink">Select state</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} className="h-8 w-8 items-center justify-center">
                <AppIcon icon={Cancel01Icon} size={20} color={colors.ink} />
              </Pressable>
            </View>

            <View className="mx-5 mb-2 flex-row items-center gap-2 rounded-2xl bg-[#EEF0F2] px-4 py-3">
              <AppIcon icon={Search01Icon} size={18} color="#9AA5A3" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search state"
                placeholderTextColor="#9AA5A3"
                autoCorrect={false}
                className="flex-1 text-[15px] font-medium text-ink"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="pb-safe-offset-4"
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable onPress={() => pick(item)} className="flex-row items-center justify-between px-5 py-3.5">
                    <Text className={`text-[15px] ${selected ? 'font-bold text-ink' : 'font-medium text-ink/80'}`}>{item}</Text>
                    {selected && <AppIcon icon={Tick01Icon} size={18} color="#1447E6" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text className="px-5 py-6 text-center text-[14px] font-medium text-ink/40">No match</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
