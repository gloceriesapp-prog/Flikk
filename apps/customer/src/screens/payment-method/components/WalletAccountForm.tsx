import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export function WalletAccountForm({ walletName, onContinue, busy = false, buttonLabel = 'Continue with wallet' }: {
  walletName: string;
  onContinue: (contact: string) => void;
  busy?: boolean;
  buttonLabel?: string;
}) {
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const valid = /^[6-9]\d{9}$/.test(phone);
  return <View className="mt-4 border-t border-[#EEEEF2] pt-4">
    <Text className="mb-2 text-[13px] font-medium text-ink/70">Wallet mobile number</Text>
    <View className="min-h-[50px] flex-row items-center rounded-xl border bg-white" style={{ borderColor: focused ? '#171717' : '#D5D5DA' }}>
      <View className="border-r border-[#E5E5EA] px-3 py-2">
        <Text className="text-[15px] font-medium text-ink">+91</Text>
      </View>
      <TextInput accessibilityLabel={`${walletName} mobile number`} value={phone}
        onChangeText={text => setPhone(text.replace(/\D/g, '').slice(0, 10))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        keyboardType="phone-pad" autoComplete="tel-national" textContentType="telephoneNumber"
        maxLength={10} editable={!busy} placeholder="Enter mobile number" placeholderTextColor="#97979F"
        className="min-h-[50px] flex-1 px-3 text-[15px] font-medium text-ink" />
    </View>
    <Text className="mt-2 text-[12px] leading-[18px] text-ink/50">Use your {walletName} number. You’ll complete wallet verification at checkout before paying.</Text>
    <Pressable onPress={() => { if (valid && !busy) onContinue(`+91${phone}`); }}
      disabled={!valid || busy} accessibilityRole="button" accessibilityLabel={`${buttonLabel} ${walletName}`}
      accessibilityState={{ disabled: !valid || busy, busy }}
      className="mt-3 min-h-[48px] items-center justify-center rounded-xl px-4 py-3"
      style={{ backgroundColor: valid && !busy ? '#155DFC' : '#A5BEFA' }}>
      <Text className="text-[15px] font-semibold text-white">{busy ? 'Please wait…' : buttonLabel}</Text>
    </Pressable>
  </View>;
}
