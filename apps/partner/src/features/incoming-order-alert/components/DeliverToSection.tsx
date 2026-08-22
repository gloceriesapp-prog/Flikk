// "Deliver to" — name only. Address and the call button were cut: this
// screen has to fit one viewport without scrolling now (see
// IncomingOrderAlert.tsx's own note), and a two-line address plus a phone
// button were the single heaviest row in the old card. The full address
// and a way to call the customer both still belong somewhere — just on
// OrderDetailScreen after the order's been accepted, not on the ~45s
// decision of whether to accept it at all.

import { Text, View } from 'react-native';
import { Location01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  customerName: string;
}

export function DeliverToSection({ customerName }: Props) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-200">
        <AppIcon icon={Location01Icon} size={20} color={colors.ink} />
      </View>
      <View>
        <Text className="text-sm font-medium text-ink/40">Orderd by</Text>
        <Text className="text-base font-medium text-ink">{customerName}</Text>
      </View>
    </View>
  );
}
