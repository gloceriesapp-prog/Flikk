import { Modal, Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SORT_OPTIONS, DEFAULT_FILTERS, type BrandOption, type FilterPanel, type ProductFilters } from './productFilters';

interface Props {
  panel: FilterPanel | null;
  filters: ProductFilters;
  types: { id: string; label: string }[];
  brands: BrandOption[];
  onChange: (filters: ProductFilters) => void;
  onClose: () => void;
}

const TITLES: Record<FilterPanel, string> = { all: 'Product filters', sort: 'Sort by', type: 'Product type', brand: 'Brand' };

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} className="min-h-12 flex-row items-center justify-between gap-3 px-5 py-3">
      <Text className={`flex-1 text-[15px] ${selected ? 'font-semibold text-[#155DFC]' : 'text-ink'}`}>{label}</Text>
      <View className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[#155DFC]' : 'border-gray-300'}`}>
        {selected && <View className="h-2.5 w-2.5 rounded-full bg-[#155DFC]" />}
      </View>
    </Pressable>
  );
}

export function CategoryFilterSheet({ panel, filters, types, brands, onChange, onClose }: Props) {
  const { height } = useWindowDimensions();
  const show = (section: FilterPanel) => panel === 'all' || panel === section;
  return (
    <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} className="absolute inset-0" />
        <View accessibilityViewIsModal className="rounded-t-[28px] bg-white pb-safe" style={{ maxHeight: height * 0.8 }}>
          <View className="flex-row items-center justify-between gap-3 px-5 py-4">
            <Text accessibilityRole="header" className="text-[18px] font-bold text-ink">{panel ? TITLES[panel] : 'Product filters'}</Text>
            <Pressable accessibilityRole="button" onPress={() => onChange({ ...DEFAULT_FILTERS })} className="min-h-11 justify-center px-2"><Text className="text-[14px] font-semibold text-[#155DFC]">Reset</Text></Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {show('sort') && <View className="pb-3">
              {panel === 'all' && <Text className="px-5 pb-2 font-semibold text-ink/60">Sort by</Text>}
              {SORT_OPTIONS.map((option) => <Choice key={option.value} label={option.label} selected={filters.sort === option.value} onPress={() => onChange({ ...filters, sort: option.value })} />)}
            </View>}
            {show('type') && <View className="pb-3">
              {panel === 'all' && <Text className="px-5 pb-2 font-semibold text-ink/60">Type</Text>}
              <Choice label="All types" selected={!filters.type} onPress={() => onChange({ ...filters, type: '' })} />
              {types.map((type) => <Choice key={type.id} label={type.label} selected={filters.type === type.id} onPress={() => onChange({ ...filters, type: type.id })} />)}
              {types.length === 0 && <Text className="px-5 pb-3 text-[13px] leading-5 text-ink/55">Type details aren’t available for these products yet.</Text>}
            </View>}
            {show('brand') && <View className="pb-3">
              {panel === 'all' && <Text className="px-5 pb-2 font-semibold text-ink/60">Brand</Text>}
              <Choice label="All brands" selected={!filters.brand} onPress={() => onChange({ ...filters, brand: '' })} />
              {brands.map((brand) => <Choice key={brand.id} label={brand.name} selected={filters.brand === brand.id} onPress={() => onChange({ ...filters, brand: brand.id })} />)}
              {brands.length === 0 && <Text className="px-5 pb-3 text-[13px] leading-5 text-ink/55">Brand details aren’t available for these products yet.</Text>}
            </View>}
            {panel === 'all' && <View className="gap-2 px-5 pb-3">
              <View className="min-h-12 flex-row items-center justify-between"><Text className="text-[15px] text-ink">Vegetarian only</Text><Switch accessibilityLabel="Vegetarian only" value={filters.vegOnly} onValueChange={(vegOnly) => onChange({ ...filters, vegOnly })} trackColor={{ true: '#155DFC' }} /></View>
              <View className="min-h-12 flex-row items-center justify-between"><Text className="text-[15px] text-ink">Offers only</Text><Switch accessibilityLabel="Offers only" value={filters.dealsOnly} onValueChange={(dealsOnly) => onChange({ ...filters, dealsOnly })} trackColor={{ true: '#155DFC' }} /></View>
            </View>}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} className="mx-5 mb-4 mt-3 min-h-12 items-center justify-center rounded-2xl bg-[#155DFC] px-4"><Text className="text-[15px] font-semibold text-white">Show products</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
