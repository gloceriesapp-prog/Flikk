// Payment groups, selection-only (Cart places the order). UPI apps (only
// those actually installed) use Cashfree UPI intent; UPI ID (iOS only, NPCI
// withdrew collect on Android) uses a verified collect request; cards, netbanking and the rest use Cashfree checkout.
import { Image, Pressable, Text, View } from 'react-native';
import { CreditCardIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors, minTouchTarget } from '../../../theme/tokens';
import { UpiIdSection } from './UpiIdSection';
import { UPI_ID_SUPPORTED } from '../../../payments/upiIntent';
import type { UpiApp } from '../../../payments/upiApps';

import type { PaymentMethod } from '../../../payments/paymentMethod';
import { storageUrl } from '../../../utils/storageUrl';

const CASH_ICON_URL = storageUrl('icons/Cash.png');


const BRAND_ACCENT = colors.limeDeep;

function SelectionArrow({ selected }: { selected: boolean }) {
  return <AppIcon icon={ArrowRight01Icon} size={20} color={selected ? BRAND_ACCENT : colors.ink} />;
}

function AppBadge({ icon }: { icon: typeof CreditCardIcon }) {
  return (
    <View className="h-12 w-12 items-center justify-center border border-gray-100">
      <AppIcon icon={icon} size={26} color={colors.ink} />
    </View>
  );
}

function ImageBadge({ uri }: { uri: string }) {
  return (
    <View className="h-12 w-12 items-center justify-center border border-gray-100">
      <AppImage source={{ uri }} contentFit="contain" style={{ width: 32, height: 32 }} />
    </View>
  );
}

function UpiAppBadge({ app }: { app: UpiApp }) {
  if (app.iconUri) {
    return <Image source={{ uri: app.iconUri }} className="h-12 w-12" />;
  }
  return (
    <View className="h-12 w-12 items-center justify-center" style={{ backgroundColor: app.color }}>
      <Text className="text-lg font-extrabold text-white">{app.name.charAt(0)}</Text>
    </View>
  );
}

interface Props {
  method: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  upiApps: UpiApp[];
  // Omitted (profile preference mode): a saved preference can't carry a VPA.
  upiId?: { initialVpa?: string; remembered: boolean; onUse: (vpa: string, remember: boolean) => void };
}

// Last-used app (the saved/selected method) first; rest in list order.
export function orderUpiApps(apps: UpiApp[], method: PaymentMethod | null): UpiApp[] {
  const lastId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;
  return [...apps].sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId));
}

export function PaymentMethodList({ method, onSelect, upiApps: detectedApps, upiId }: Props) {
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;
  const upiApps = orderUpiApps(detectedApps, method);

  return (
    <View className="mt-6 gap-6">
      {upiApps.length > 0 ? (
        <View>
          <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay with UPI app</Text>
          <View className="bg-white p-4" style={{ borderRadius: 12 }}>
            {upiApps.map((app, index) => {
              const isSelected = selectedUpiAppId === app.id;
              const isLast = index === upiApps.length - 1;
              return (
                <View key={app.id} className={isLast ? '' : 'mb-3 border-b border-dashed border-gray-100 pb-3'}>
                  <Pressable onPress={() => onSelect(`upi_app:${app.id}`)} accessibilityRole="button"
                    accessibilityLabel={`Pay with ${app.name}`} accessibilityState={{ selected: isSelected }}
                    className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
                    <UpiAppBadge app={app} />
                    <View className="flex-1 flex-row items-center gap-2">
                      <Text className="text-[15px] font-medium text-ink">{app.name}</Text>
                      
                      {index === 0 && app.id === selectedUpiAppId ? (
                        <View className="rounded-full bg-lime-soft px-2 py-0.5">
                          <Text className="text-[10.5px] font-semibold uppercase tracking-wide text-ink">Last used</Text>
                        </View>
                      ) : null}
                    </View>
                    <SelectionArrow selected={isSelected} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {upiId && UPI_ID_SUPPORTED ? <UpiIdSection initialVpa={upiId.initialVpa} rememberedByDefault={upiId.remembered}
        selected={method === 'upi_id'} onUse={upiId.onUse} /> : null}

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">{'Cards, netbanking & more'}</Text>
        <View className="bg-white p-4" style={{ borderRadius: 12 }}>
          <Pressable onPress={() => onSelect('card')} accessibilityRole="button" accessibilityLabel="Pay with card, netbanking or other options"
            accessibilityState={{ selected: method === 'card' }} className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
            <AppBadge icon={CreditCardIcon} />
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Credit / Debit Card</Text>
              <Text className="mt-0.5 text-[12.5px] font-medium text-ink/50">Also netbanking, wallets and UPI QR</Text>
            </View>
            <SelectionArrow selected={method === 'card'} />
          </Pressable>
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay on Delivery</Text>
        <View className="bg-white p-4 mt-1" style={{ borderRadius: 12 }}>
          <Pressable onPress={() => onSelect('cod')} accessibilityRole="button" accessibilityLabel="Cash on delivery"
            accessibilityState={{ selected: method === 'cod' }} className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
            <ImageBadge uri={CASH_ICON_URL} />
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Cash on Delivery</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50 font-medium">Keep exact change ready for the rider.</Text>
            </View>
            <SelectionArrow selected={method === 'cod'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
