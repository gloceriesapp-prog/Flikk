import {
  Call02Icon,
  Door01Icon,
  HandHelpingIcon,
  NotificationOff01Icon,
} from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import {
  composeDeliveryInstructions,
  DELIVERY_INSTRUCTION_OPTIONS,
  toggleDeliveryInstruction,
  type DeliveryInstructionId,
} from '../deliveryInstructions';

const icons = {
  call: Call02Icon,
  no_bell: NotificationOff01Icon,
  door: Door01Icon,
  hand: HandHelpingIcon,
};

export function DeliveryInstructionsCard({
  selected,
  custom,
  onChange,
}: {
  selected: DeliveryInstructionId[];
  custom: string;
  onChange: (value: DeliveryInstructionId[]) => void;
}) {
  return (
    <View className="gap-2 rounded-2xl bg-white py-3">
      <View className="gap-1 px-4">
        <Text accessibilityRole="header" className="text-[16px] font-semibold text-black">
          How should we deliver?
        </Text>
        <Text className="text-[12px] leading-[18px] text-ink/50">
          Choose instructions for your rider. Optional.
        </Text>
      </View>
      <ScrollView
        horizontal
        style={{ flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'flex-start' }}
      >
        {DELIVERY_INSTRUCTION_OPTIONS.map((option) => {
          const checked = selected.includes(option.id);
          const next = toggleDeliveryInstruction(selected, option.id);
          const disabled = !checked && composeDeliveryInstructions(custom, next).length > 300;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => onChange(next)}
              style={{ width: 126, minHeight: 86, opacity: disabled ? 0.4 : 1 }}
              className={`justify-start gap-2 rounded-xl border p-2.5 ${checked ? 'border-[#1447E6] bg-[#F4F6FF]' : 'border-[#E8E8ED] bg-white'}`}
            >
              <View className="flex-row items-center justify-between">
                <AppIcon icon={icons[option.id]} size={21} color="#202525" />
                <View
                  className={`h-[18px] w-[18px] items-center justify-center rounded-full border ${checked ? 'border-[#1447E6] bg-[#1447E6]' : 'border-[#C8CDCC]'}`}
                >
                  {checked ? <Text className="text-[11px] font-semibold text-white">✓</Text> : null}
                </View>
              </View>
              <Text className="text-[13px] font-medium leading-[18px] text-ink">
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {custom.length > 210 ? (
        <Text className="px-4 text-[12px] text-ink/50">
          Shorten your directions if an option is unavailable.
        </Text>
      ) : null}
    </View>
  );
}
