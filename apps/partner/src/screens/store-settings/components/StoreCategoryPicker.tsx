// Collapsed by default — shows just the store's own selected category as a
// pill, with a "Change" link at the end to expand into the full grid. Per
// an explicit ask: a settings screen a shop owner opens to check/tweak one
// thing shouldn't lead with a 9-option grid when there's already a real
// answer to show. The grid itself (picked from STORE_CATEGORIES, data.ts)
// only appears once "Change" is tapped, or immediately if no category is
// set yet (nothing to summarize in that case).
//
// "Others" is the one deliberate escape hatch: a store type outside the
// fixed list still needs somewhere to go, so picking it reveals a
// free-text box instead of blocking signup on a list that can't cover
// every kirana/pharmacy variant.

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { STORE_CATEGORIES } from '../data';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

const OTHERS_LABEL = 'Others';
const ACCENT = '#1754cf';

export function StoreCategoryPicker({ selected, onSelect }: Props) {
  const isKnownCategory = STORE_CATEGORIES.includes(selected);
  const [othersActive, setOthersActive] = useState(selected.length > 0 && !isKnownCategory);
  const [expanded, setExpanded] = useState(selected.length === 0);

  function handleSelect(category: string) {
    setOthersActive(false);
    onSelect(category);
    setExpanded(false);
  }

  function handleSelectOthers() {
    setOthersActive(true);
    onSelect('');
  }

  if (!expanded) {
    return (
      <View className="flex-row items-center justify-between">
        <View className="rounded-full bg-ink px-4 py-2">
          <Text className="text-[15px] font-semibold text-white">{selected}</Text>
        </View>
        <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
          <Text className="text-[14px] font-bold" style={{ color: ACCENT }}>
            Change
          </Text>
        </Pressable>
      </View>
    );
  }

  const options = [...STORE_CATEGORIES, OTHERS_LABEL];

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2.5">
        {options.map((category) => {
          const isOthers = category === OTHERS_LABEL;
          const isActive = isOthers ? othersActive : selected === category;
          return (
            <Pressable
              key={category}
              onPress={() => (isOthers ? handleSelectOthers() : handleSelect(category))}
              className="basis-[48%] grow items-center rounded-2xl bg-[#F9FAFB] px-3 py-3.5"
              style={({ pressed }) => ({
                borderColor: isActive ? '#101C10' : '#1754cf',
                backgroundColor: isActive ? '#101C10' : '#00000000',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text className={`text-[15px] font-medium ${isActive ? 'text-white' : 'text-ink/70'}`}>{category}</Text>
            </Pressable>
          );
        })}
      </View>

      {othersActive && (
        <TextInput
          value={isKnownCategory ? '' : selected}
          onChangeText={onSelect}
          placeholder="Tell us your store category"
          placeholderTextColor="#9AA5A3"
          autoFocus
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-medium text-ink"
        />
      )}
    </View>
  );
}
