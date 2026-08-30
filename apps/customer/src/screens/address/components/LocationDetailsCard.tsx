// House/building + street feed into one addresses.line1 string on save
// (AddressFormScreen's own note) — split into two fields here purely for
// how a real kirana-delivery address actually gets read out loud ("flat
// 4B, Shanti Nivas... then Church Road"), not a schema change. The pinned-
// area row is read-only display of what the map screen already resolved,
// with "Change" jumping back to re-pick the pin rather than letting free
// text silently drift from the real geocoded location riders navigate to.

import { ArrowRight01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

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
    <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-sm font-bold text-ink">Where exactly?</Text>

      <TextInput
        value={building}
        onChangeText={onChangeBuilding}
        placeholder="Flat / House no., building"
        placeholderTextColor="#9AA5A3"
        className="rounded-xl border border-gray-100 bg-mist px-4 py-3 text-base text-ink"
      />

      <TextInput
        value={street}
        onChangeText={onChangeStreet}
        placeholder="Street / area (optional)"
        placeholderTextColor="#9AA5A3"
        className="rounded-xl border border-gray-100 bg-mist px-4 py-3 text-base text-ink"
      />

      <Pressable onPress={onChangePin} className="flex-row items-center gap-3 rounded-xl border border-gray-100 bg-mist px-4 py-3">
        <AppIcon icon={Location01Icon} size={16} color={colors.limeDeep} />
        <Text className="flex-1 text-sm text-ink/70" numberOfLines={2}>
          {pinnedArea}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-sm font-bold text-lime-deep">Change</Text>
          <AppIcon icon={ArrowRight01Icon} size={13} color={colors.limeDeep} />
        </View>
      </Pressable>

      <TextInput
        value={landmark}
        onChangeText={onChangeLandmark}
        placeholder="Landmark — near X, opposite Y (optional)"
        placeholderTextColor="#9AA5A3"
        className="rounded-xl border border-gray-100 bg-mist px-4 py-3 text-base text-ink"
      />
    </View>
  );
}
