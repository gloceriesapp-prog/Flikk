import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

interface Props {
  building: string;
  street: string;
  landmark: string;
  instructions: string;
  instructionsMaxLength?: number;
  pinnedArea: string;
  onChangeBuilding: (value: string) => void;
  onChangeStreet: (value: string) => void;
  onChangeLandmark: (value: string) => void;
  onChangeInstructions: (value: string) => void;
  onChangePin?: () => void;
}

function AddressField({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
  optional = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  optional?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-ink/80">
        {label}{' '}
        {optional ? (
          <Text className="text-ink/50">(optional)</Text>
        ) : (
          <Text className="text-danger">*</Text>
        )}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA5A3"
        maxLength={maxLength}
        autoCapitalize="sentences"
        className="min-h-[52px] rounded-xl border border-[#E8E8ED] bg-[#FAFAFA] px-3.5 py-3 text-[14px] font-medium text-ink"
      />
    </View>
  );
}

export function LocationDetailsCard({
  building,
  street,
  landmark,
  instructions,
  instructionsMaxLength = 300,
  pinnedArea,
  onChangeBuilding,
  onChangeStreet,
  onChangeLandmark,
  onChangeInstructions,
  onChangePin,
}: Props) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-[16px] font-semibold text-black">
          Help your rider find your door
        </Text>
      </View>
      <View className="gap-2">
        <Text className="text-[13px] font-medium text-ink/80">Location selected on map</Text>
        <Pressable
          onPress={onChangePin}
          disabled={!onChangePin}
          accessibilityRole={onChangePin ? 'button' : undefined}
          accessibilityLabel={onChangePin ? 'Change map location' : undefined}
          className="min-h-[52px] flex-row items-center gap-3 rounded-xl bg-[#FAFAFA] px-3.5 py-3"
        >
          <Text className="flex-1 text-[13px] font-medium leading-5 text-ink">{pinnedArea}</Text>
          {onChangePin && (
            <View className="min-h-11 flex-row items-center gap-0.5">
              <Text className="text-[13px] font-semibold text-[#155DFC]">Change</Text>
              <AppIcon icon={ArrowRight01Icon} size={13} color="#155DFC" />
            </View>
          )}
        </Pressable>
      </View>
      <AddressField
        label="House / flat number & building"
        placeholder="e.g. 4B, Shanti Nivas"
        value={building}
        onChange={onChangeBuilding}
        maxLength={150}
      />
      <AddressField
        label="Street / road & area"
        placeholder="e.g. Temple Road, Yenna Gudde"
        value={street}
        onChange={onChangeStreet}
        maxLength={140}
      />
      <AddressField
        label="Nearby landmark"
        placeholder="e.g. Opposite Achada School"
        value={landmark}
        onChange={onChangeLandmark}
        maxLength={200}
      />
      <AddressField
        optional
        label="Floor & entrance directions"
        placeholder="e.g. Ground floor, blue gate beside the shop"
        value={instructions}
        onChange={onChangeInstructions}
        maxLength={instructionsMaxLength}
      />
    </View>
  );
}
