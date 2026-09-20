import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { STORE_CATEGORIES } from '../data';
import { AppIcon } from '../../../components/AppIcon';
import { ArrowDown01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { colors } from '../../../theme/tokens';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

const OTHERS_LABEL = 'Others';
const ACCENT = '#1754cf';

export function StoreCategoryPicker({ selected, onSelect }: Props) {
  const isKnownCategory = STORE_CATEGORIES.includes(selected);
  const [othersActive, setOthersActive] = useState(selected.length > 0 && !isKnownCategory);
  const [modalVisible, setModalVisible] = useState(false);

  const options = [...STORE_CATEGORIES, OTHERS_LABEL];

  function handleSelect(category: string) {
    if (category === OTHERS_LABEL) {
      setOthersActive(true);
      onSelect('');
    } else {
      setOthersActive(false);
      onSelect(category);
    }
    setModalVisible(false);
  }

  // Display text in the collapsed dropdown input trigger
  const displayLabel = othersActive
    ? 'Others'
    : selected || 'Select store category';

  return (
    <View className="gap-2.5">
      {/* Dropdown Trigger Box */}
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
      >
        <Text className={`text-[14px] font-medium ${selected || othersActive ? 'text-ink' : 'text-[#9AA5A3]'}`}>
          {displayLabel}
        </Text>
        {/* Chevron Icon */}
        <AppIcon icon={ArrowDown01Icon} size={18} color="#000000" />
      </Pressable>

      {/* Custom Text Input if 'Others' is selected */}
      {othersActive && (
        <TextInput
          value={isKnownCategory ? '' : selected}
          onChangeText={onSelect}
          placeholder="e.g. General Store & Bakery"
          placeholderTextColor="#9AA5A3"
          autoFocus
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-ink"
        />
      )}

      {/* Bottom Sheet / Modal Options List */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setModalVisible(false)}
        >
          <View className="max-h-[60%] rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between border-b border-black/5 pb-3">
              <Text className="text-[17px] font-semibold text-ink">Select Category</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Text className="text-[14px] font-medium text-ink/40">Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="gap-1">
              {options.map((category) => {
                const isOthers = category === OTHERS_LABEL;
                const isSelected = isOthers ? othersActive : selected === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => handleSelect(category)}
                    className="flex-row items-center justify-between rounded-xl px-3 py-3.5"
                    style={({ pressed }) => ({
                      backgroundColor: isSelected ? '#F3F4F6' : pressed ? '#F9FAFB' : 'transparent',
                    })}
                  >
                    <Text
                      className={`text-[15px] ${isSelected ? 'font-semibold' : 'font-medium text-ink/80'
                        }`}
                      style={isSelected ? { color: ACCENT } : undefined}
                    >
                      {category}
                    </Text>
                    {isSelected && <Text style={{ color: ACCENT }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}