import { Platform, Pressable, Text, TextInput, View } from 'react-native';

interface Props {
  building: string;
  area: string;
  landmark: string;
  onChangeBuilding: (value: string) => void;
  onChangeLandmark: (value: string) => void;
  onChangePin?: () => void;
}

const LABEL_CLASS = `${Platform.OS === 'ios' ? 'text-[15px]' : 'text-[13px]'} font-medium text-ink/80`;
const INPUT_CLASS = `min-h-[52px] rounded-xl border border-[#E8E8ED] bg-[#FAFAFA] px-3.5 py-3 ${Platform.OS === 'ios' ? 'text-[16px]' : 'text-[14px]'} font-medium text-ink`;

export function LocationDetailsCard({ building, area, landmark, onChangeBuilding, onChangeLandmark, onChangePin }: Props) {
  return <View className="gap-4 rounded-2xl bg-white p-4">
    <View className="gap-1.5">
      <Text accessibilityRole="header" className={`${Platform.OS === 'ios' ? 'text-[18px]' : 'text-[16px]'} font-semibold text-black`}>Help your rider find your door</Text>
      <Text className={`${Platform.OS === 'ios' ? 'text-[14px] leading-[20px]' : 'text-[12px] leading-[18px]'} text-ink/60`}>Add your house details and a nearby landmark for an easier delivery.</Text>
    </View>
    <View className="gap-2">
      <Text className={LABEL_CLASS}>House/flat number/building name <Text className="text-danger">*</Text></Text>
      <TextInput accessibilityLabel="House/flat number/building name" value={building} onChangeText={onChangeBuilding}
        placeholder="e.g. 4B, Shanti Nivas" placeholderTextColor="#8B9392" maxLength={150} autoCapitalize="sentences" className={INPUT_CLASS} />
    </View>
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className={`min-w-0 flex-1 ${LABEL_CLASS}`}>Area/sector/locality</Text>
        {onChangePin && <Pressable accessibilityRole="button" accessibilityLabel="Change map location" onPress={onChangePin} hitSlop={8}>
          <Text className={`${Platform.OS === 'ios' ? 'text-[14px]' : 'text-[13px]'} font-semibold text-[#155DFC]`}>Change</Text>
        </Pressable>}
      </View>
      <TextInput accessibilityLabel="Area/sector/locality" value={area} editable={false} multiline className={INPUT_CLASS} />
      <Text className={`${Platform.OS === 'ios' ? 'text-[14px] leading-[20px]' : 'text-[12px] leading-[18px]'} text-ink/60`}>Filled from your selected map location.</Text>
    </View>
    <View className="gap-2">
      <Text className={LABEL_CLASS}>Landmark <Text className="text-danger">*</Text></Text>
      <TextInput accessibilityLabel="Landmark" value={landmark} onChangeText={onChangeLandmark}
        placeholder="e.g. Opposite Achada School" placeholderTextColor="#8B9392" maxLength={200} autoCapitalize="sentences" className={INPUT_CLASS} />
    </View>
  </View>;
}
