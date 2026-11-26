// Cart footer for a guest (not signed in): the bill above is already priced,
// so this only asks for the phone number. Tapping it opens sign-in; the cart
// is kept (accountCache keepGuestDraft) and priced again for the account.
import { SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

export function GuestCheckoutBar({ onProceed }: { onProceed: () => void }) {
  return (
    <View className="gap-3 bg-white px-4 pb-safe-offset-3 pt-3">
      <View>
        <Text className="text-[17px] font-bold text-ink">Almost there</Text>
        <Text className="mt-0.5 text-[14px] font-medium text-ink/55">Login or sign up to place your order</Text>
      </View>
      <Pressable onPress={onProceed} accessibilityRole="button" accessibilityLabel="Proceed with phone number"
        className="min-h-[54px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#155DFC] px-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <AppIcon icon={SmartPhone01Icon} size={21} color="#FFFFFF" strokeWidth={2} />
        <Text className="text-[16px] font-semibold text-white">Proceed with phone number</Text>
      </Pressable>
    </View>
  );
}
