// Full-width single-select category grid — picked from STORE_CATEGORIES
// (data.ts) wherever possible, same "fixed vocabulary drives customer-app
// filtering" reasoning as catalog's size picker. "Others" is the one
// deliberate escape hatch: a store type outside the fixed list still needs
// somewhere to go, so picking it reveals a free-text box instead of
// blocking signup on a list that can't cover every kirana/pharmacy variant.

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { STORE_CATEGORIES } from '../data';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

const OTHERS_LABEL = 'Others';

export function StoreCategoryPicker({ selected, onSelect }: Props) {
  const isKnownCategory = STORE_CATEGORIES.includes(selected);
  const [othersActive, setOthersActive] = useState(selected.length > 0 && !isKnownCategory);

  function handleSelect(category: string) {
    setOthersActive(false);
    onSelect(category);
  }

  function handleSelectOthers() {
    setOthersActive(true);
    onSelect('');
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
              <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-ink/70'}`}>{category}</Text>
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
