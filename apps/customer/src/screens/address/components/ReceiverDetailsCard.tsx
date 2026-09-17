// Who the rider actually hands the order to — required, see
// AddressFormScreen's own note on why every real quick-commerce app
// collects this. No "Use mine" shortcut here anymore — AddressFormScreen's
// own OrderingForToggle alread ay auto-fills both fields straight from the
// account the moment "Myself" is picked (still editable after, for a
// delivery meant for someone else), so a second manual "fill from account"
// action inside this card would just be a redundant path to the same data.
// "Someone else" never gets the account's own number handed to it — that
// branch clears the field outright (AddressFormScreen's own
// handleChangeOrderingFor), so it's always a real number someone typed in.
//
// +91 is a fixed prefix here, not editable text — every login on this app
// already goes through +91 (LoginScreen's own `+91${phone}`), so `phone`
// is always stored/passed around as the full "+91XXXXXXXXXX" string; this
// component only ever lets someone type the 10 digits after it.

import { Text, TextInput, View } from 'react-native';

const COUNTRY_CODE = '+91';

interface Props {
  name: string;
  phone: string;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
}

export function ReceiverDetailsCard({ name, phone, onChangeName, onChangePhone }: Props) {
  const digits = phone.replace(/^\+91/, '');

  function handleChangeDigits(next: string) {
    const cleaned = next.replace(/\D/g, '').slice(0, 10);
    onChangePhone(cleaned ? `${COUNTRY_CODE}${cleaned}` : '');
  }

  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <Text className="text-[15px] font-medium text-ink">
        Who should we hand this to? <Text className="text-danger">*</Text>
      </Text>

      <View className="h-[52px] flex-row items-center rounded-xl px-4" style={{ backgroundColor: '#FAFAFA' }}>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="Receiver's name"
          placeholderTextColor="#9AA5A3"
          textAlignVertical="center"
          className="h-full flex-1 py-0 text-base leading-tight text-ink font-medium"
        />
      </View>

      <View className="h-[52px] flex-row items-center rounded-xl px-4" style={{ backgroundColor: '#FAFAFA' }}>
        <Text className="text-base text-ink">🇮🇳</Text>
        <Text className="ml-2 text-base text-ink font-medium">{COUNTRY_CODE}</Text>
        <View className="mx-3 h-6 w-px bg-gray-300" />
        <TextInput
          value={digits}
          onChangeText={handleChangeDigits}
          placeholder="10-digit mobile number"
          placeholderTextColor="#9AA5A3"
          keyboardType="phone-pad"
          maxLength={10}
          textAlignVertical="center"
          className="h-full flex-1 py-0 text-base leading-tight text-ink"
        />
      </View>
    </View>
  );
}
