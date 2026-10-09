import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { STORE_CATEGORIES } from '../data';
import { AppIcon } from '../../../components/AppIcon';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { apiRequest } from '../../../api/client';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

export interface StoreCategoryOption {
  name: string;
  requires_drug_license: boolean;
}

const ACCENT = '#1754cf';
const FALLBACK: StoreCategoryOption[] = STORE_CATEGORIES.map((name) => ({ name, requires_drug_license: name === 'Pharmacy' }));
let cached: StoreCategoryOption[] | null = null;

// The server's list (GET /partner/store-categories) — exactly the set admin
// allows and the backend enforces on onboarding and Store Settings saves.
// The bundled list is only an offline fallback.
export function useStoreCategories(): StoreCategoryOption[] {
  const [options, setOptions] = useState<StoreCategoryOption[]>(cached ?? FALLBACK);
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    apiRequest<StoreCategoryOption[]>('/partner/store-categories')
      .then((list) => {
        if (!Array.isArray(list) || list.length === 0) return;
        cached = list;
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        // Keep the fallback; the server still validates on save.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return options;
}

export function categoryNeedsDrugLicense(options: StoreCategoryOption[], category: string): boolean {
  return options.some((option) => option.name === category && option.requires_drug_license);
}

export function StoreCategoryPicker({ selected, onSelect }: Props) {
  const options = useStoreCategories();
  const [modalVisible, setModalVisible] = useState(false);
  const isKnown = options.some((option) => option.name === selected);

  function handleSelect(category: string) {
    onSelect(category);
    setModalVisible(false);
  }

  return (
    <View className="gap-2.5">
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
      >
        <Text className={`text-[14px] font-medium ${selected ? 'text-ink' : 'text-[#9AA5A3]'}`}>
          {selected || 'Select store category'}
        </Text>
        <AppIcon icon={ArrowDown01Icon} size={18} color="#000000" />
      </Pressable>

      {/* A legacy free-text category from before this list was enforced. */}
      {selected.length > 0 && !isKnown && (
        <Text className="text-[12px] font-medium text-danger">Pick a category from the list — this one is no longer accepted.</Text>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setModalVisible(false)}>
          <View className="max-h-[60%] rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between border-b border-black/5 pb-3">
              <Text className="text-[17px] font-semibold text-ink">Select Category</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Text className="text-[14px] font-medium text-ink/40">Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="gap-1">
              {options.map(({ name, requires_drug_license }) => {
                const isSelected = selected === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => handleSelect(name)}
                    className="flex-row items-center justify-between rounded-xl px-3 py-3.5"
                    style={({ pressed }) => ({
                      backgroundColor: isSelected ? '#F3F4F6' : pressed ? '#F9FAFB' : 'transparent',
                    })}
                  >
                    <View>
                      <Text
                        className={`text-[15px] ${isSelected ? 'font-semibold' : 'font-medium text-ink/80'}`}
                        style={isSelected ? { color: ACCENT } : undefined}
                      >
                        {name}
                      </Text>
                      {requires_drug_license && <Text className="text-[12px] font-medium text-ink/40">Needs a drug licence number</Text>}
                    </View>
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
