import { Image, Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon, CreditCardIcon, Money03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import type { UpiApp } from '../../../payments/upiApps';
import { paymentMethodLabel, type PaymentMethod } from '../../../payments/paymentMethod';

export function PaymentMethodBadge({ method, apps }: { method: PaymentMethod; apps: UpiApp[] }) {
  const app = apps.find((item) => `upi_app:${item.id}` === method);
  return (
    <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#F1F4FA]">
      {app?.iconUri ? <Image source={{ uri: app.iconUri }} style={{ width: 28, height: 28 }} /> :
        app ? <Text style={{ color: app.color }} className="text-lg font-bold">{app.name[0]}</Text> :
          <AppIcon icon={method === 'cod' ? Money03Icon : CreditCardIcon} size={21} color="#155DFC" />}
    </View>
  );
}

export function PaymentMethodRow({ method, apps, selected, onPress }: {
  method: PaymentMethod; apps: UpiApp[]; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      className="min-h-[68px] flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
      <PaymentMethodBadge method={method} apps={apps} />
      <Text className="flex-1 text-[15px] font-semibold text-ink">{paymentMethodLabel(method, apps)}</Text>
      <AppIcon icon={ArrowRight01Icon} size={20} color={selected ? '#155DFC' : '#4B5563'} />
    </Pressable>
  );
}
