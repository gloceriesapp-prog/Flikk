import { createContext, useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tick01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';

// Checkout mode for the payment list: tapping a row only selects it, the
// selected row shows a blue tick and a "Pay via …" button right under it.
// null (profile preference) keeps the original tap-to-act arrow rows.
export interface PaymentConfirm { label: string; onConfirm: () => void }
export const PaymentConfirmContext = createContext<PaymentConfirm | null>(null);
export const usePaymentConfirm = () => useContext(PaymentConfirmContext);

const BLUE = '#2457F5';

export function SelectedTick({ selected }: { selected: boolean }) {
  return selected ? (
    <View className="h-[26px] w-[26px] items-center justify-center rounded-full" style={{ backgroundColor: BLUE }}>
      <AppIcon icon={Tick01Icon} size={16} color="#FFFFFF" strokeWidth={2.6} />
    </View>
  ) : (
    <View className="h-[26px] w-[26px] rounded-full border-2 border-[#D5D9E0]" />
  );
}

// Lines up under the option name (48px logo + 12px gap).
export function InlinePayButton({ selected }: { selected: boolean }) {
  const confirm = usePaymentConfirm();
  if (!selected || !confirm) return null;
  return (
    <Pressable onPress={confirm.onConfirm} accessibilityRole="button" accessibilityLabel={confirm.label}
      className="ml-[60px] mt-3 min-h-[52px] items-center justify-center rounded-2xl px-4 active:opacity-85" style={{ backgroundColor: BLUE }}>
      <Text numberOfLines={1} className="text-[16px] font-semibold text-white">{confirm.label}</Text>
    </Pressable>
  );
}
