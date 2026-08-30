// Who the rider actually hands the order to — required, see
// AddressFormScreen's own note on why every real quick-commerce app
// collects this. "Use my number" is a one-tap fill from the account's own
// verified phone (still editable after — a customer ordering for someone
// else needs to overwrite it), not a checkbox that locks the field.

import { Call02Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  name: string;
  phone: string;
  accountPhone: string | null;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
}

export function ReceiverDetailsCard({ name, phone, accountPhone, onChangeName, onChangePhone }: Props) {
  return (
    <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-sm font-bold text-ink">Who&apos;s receiving this?</Text>

      <View className="flex-row items-center gap-3 border-b border-gray-100 pb-3">
        <AppIcon icon={UserIcon} size={16} color={`${colors.ink}80`} />
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="Receiver's name"
          placeholderTextColor="#9AA5A3"
          className="flex-1 text-base text-ink"
        />
      </View>

      <View className="flex-row items-center gap-3">
        <AppIcon icon={Call02Icon} size={16} color={`${colors.ink}80`} />
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          placeholder="10-digit mobile number"
          placeholderTextColor="#9AA5A3"
          keyboardType="phone-pad"
          className="flex-1 text-base text-ink"
        />
        {accountPhone && phone !== accountPhone && (
          <Pressable onPress={() => onChangePhone(accountPhone)} hitSlop={8} className="rounded-full bg-lime-soft px-3 py-1.5">
            <Text className="text-xs font-bold text-lime-deep">Use mine</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
