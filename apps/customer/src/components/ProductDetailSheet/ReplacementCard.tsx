// "12 hours only replacement" row under the product card. A tap opens a short
// dialog explaining the policy, closed with the corner X or a tap outside.
import { PackageMovingIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { IconlyClose } from '../icons/IconlyClose';
import { colors } from '../../theme/tokens';

export function ReplacementCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="12 hours only replacement, read the policy"
        onPress={() => setOpen(true)} className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6]">
          <AppIcon icon={PackageMovingIcon} size={22} color={colors.ink} />
        </View>
        <Text className="flex-1 text-[15px] font-semibold text-ink">12 hours only replacement</Text>
        <AppIcon icon={ChevronRightIcon} size={16} color={colors.ink} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/40 px-8">
          {/* Taps inside the card don't close it. */}
          <Pressable onPress={() => {}} className="w-full rounded-3xl bg-white px-6 pb-6 pt-6">
            <Text className="pr-8 text-[17px] font-semibold text-ink">12 hours replacement</Text>
            <Text className="mt-2 text-[14px] leading-[21px] text-ink/70">
              Got a damaged, spoiled or wrong item? Ask for a replacement within 12 hours of delivery from Help on your order, and we will sort it out.
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={10}
              className="absolute right-4 top-4 h-8 w-8 items-center justify-center">
              <IconlyClose size={22} color="#101C10" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
