import { Image, Pressable, Text, View } from 'react-native';
import { BankIcon, CreditCardIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { WalletOptions } from './WalletOptions';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors, minTouchTarget } from '../../../theme/tokens';
import type { UpiApp } from '../../../payments/upiApps';

import type { AllowedPaymentMethods, PaymentMethod } from '../../../payments/paymentMethod';



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

function MethodRow({ icon, title, subtitle, selected, onPress, label }: {
  icon: typeof CreditCardIcon; title: string; subtitle: string; selected: boolean; onPress: () => void; label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected }} className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
      <AppBadge icon={icon} />
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12.5px] font-medium text-ink/50">{subtitle}</Text>
      </View>
      <SelectionArrow selected={selected} />
    </Pressable>
  );
}

interface Props {
  method: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onWalletSelect?: (method: PaymentMethod, contact: string) => void;
  upiApps: UpiApp[];
  // Methods switched off by admin are not offered (GET /payments/availability).
  allowed?: AllowedPaymentMethods;
  // Resume an existing S2S intent without offering a different payment flow.
  upiOnly?: boolean;
}

// Put the saved or currently selected preference first.
export function orderUpiApps(apps: UpiApp[], method: PaymentMethod | null): UpiApp[] {
  const lastId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;
  return [...apps].sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId));
}

export function PaymentMethodList({ method, onSelect, onWalletSelect, upiApps: detectedApps, allowed = { cod: true, online: true }, upiOnly = false }: Props) {
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;
  const upiApps = allowed.online ? orderUpiApps(detectedApps, method) : [];

  return (
    <View className="mt-6 gap-6">
      {!allowed.online && (
        <Text className="px-1 text-[13px] font-medium text-ink/60">
          {allowed.cod ? 'Online payment is not available right now. You can pay cash on delivery.' : 'Payments are not available right now. Please try again later.'}
        </Text>
      )}
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
                          <Text className="text-[10.5px] font-semibold uppercase tracking-wide text-ink">Selected</Text>
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

      {allowed.online && !upiOnly && <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">{'Cards & netbanking'}</Text>
        <View className="bg-white p-4" style={{ borderRadius: 12 }}>
          <View className="mb-3 border-b border-dashed border-gray-100 pb-3">
            <MethodRow icon={CreditCardIcon} title="Credit / Debit Card" subtitle="Pay securely with Razorpay"
              selected={method === 'card'} onPress={() => onSelect('card')} label="Pay with credit or debit card" />
          </View>
          <MethodRow icon={BankIcon} title="Netbanking" subtitle="Choose from available banks"
            selected={method === 'netbanking'} onPress={() => onSelect('netbanking')} label="Pay with netbanking" />
        </View>
      </View>}

      {allowed.online && !upiOnly && <WalletOptions method={method} onSelect={onWalletSelect ?? onSelect} />}

      {allowed.cod && !upiOnly && <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay on Delivery</Text>
        <View className="bg-white p-4 mt-1" style={{ borderRadius: 12 }}>
          <Pressable onPress={() => onSelect('cod')} accessibilityRole="button" accessibilityLabel="Cash on delivery"
            accessibilityState={{ selected: method === 'cod' }} className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
            <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
              <AppImage source={require('../../../../assets/payment/cash-stack.png')} contentFit="contain" style={{ width: 64, height: 64 }} accessible={false} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Cash on Delivery</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50 font-medium">Keep exact change ready for the rider.</Text>
            </View>
            <SelectionArrow selected={method === 'cod'} />
          </Pressable>
        </View>
      </View>}
    </View>
  );
}
