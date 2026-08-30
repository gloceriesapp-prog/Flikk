// House/building + street feed into one addresses.line1 string on save
// (AddressFormScreen's own note) — split into two fields here purely for
// how a real kirana-delivery address actually gets read out loud ("flat
// 4B, Shanti Nivas... then Church Road"), not a schema change. The pinned-
// area row is read-only display of what the map screen already resolved,
// with "Change" jumping back to re-pick the pin rather than letting free
// text silently drift from the real geocoded location riders navigate to.

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

interface Props {
  building: string;
  street: string;
  landmark: string;
  pinnedArea: string;
  onChangeBuilding: (value: string) => void;
  onChangeStreet: (value: string) => void;
  onChangeLandmark: (value: string) => void;
  onChangePin: () => void;
}

export function LocationDetailsCard({
  building,
  street,
  landmark,
  pinnedArea,
  onChangeBuilding,
  onChangeStreet,
  onChangeLandmark,
  onChangePin,
}: Props) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <Text className="text-[15px] font-medium text-ink">
        Pin the exact spot <Text className="text-danger">*</Text>
      </Text>

      <View className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
        <TextInput
          value={building}
          onChangeText={onChangeBuilding}
          placeholder="Flat / House no., building"
          placeholderTextColor="#9AA5A3"
          className="text-base text-ink"
        />
      </View>

      <View className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
        <TextInput
          value={street}
          onChangeText={onChangeStreet}
          placeholder="Street / area (optional)"
          placeholderTextColor="#9AA5A3"
          className="text-base text-ink"
        />
      </View>

      <Pressable onPress={onChangePin} className="flex-row items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
        <Text className="flex-1 text-sm text-ink/70" numberOfLines={1}>
          {pinnedArea}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-sm font-bold" style={{ color: '#155DFC' }}>
            Change
          </Text>
          <AppIcon icon={ArrowRight01Icon} size={13} color="#155DFC" />
        </View>
      </Pressable>

      <View className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
        <TextInput
          value={landmark}
          onChangeText={onChangeLandmark}
          placeholder="Landmark — near X, opposite Y (optional)"
          placeholderTextColor="#9AA5A3"
          className="text-base text-ink"
        />
      </View>
    </View>
  );
}
