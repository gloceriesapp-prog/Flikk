// Two sections — "Pay on Delivery" gets its own inline Pay button the
// moment it's picked (Cash on Delivery is the only method this app
// actually settles right now), and "Pay by any UPI App" lists the
// individual apps a customer expects to see plus a fourth "Enter UPI ID"
// row that reveals a real text field instead of just a radio dot. None of
// these UPI rows launch a real app yet — the real Razorpay Checkout SDK
// (api/payments.ts, payments/openRazorpayCheckout.ts) needs a native
// dev-client build this app isn't shipping while it runs in Expo Go —
// CheckoutScreen's handlePay shows a "coming soon" alert for every method
// except cod. Only the COD row carries a subtitle; the UPI app rows are
// self-explanatory by name+icon alone.

import { useState } from 'react';
import { AtIcon, BankIcon, BanknoteIcon, SmartPhone01Icon, Tick02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PAYMENT_METHOD_ICON_URL } from '../../../theme/paymentIcons';

export type PaymentMethod = 'cod' | 'google_pay' | 'phonepe' | 'amazon_pay' | 'upi_id';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
  google_pay: 'Google Pay',
  phonepe: 'PhonePe UPI',
  amazon_pay: 'Amazon Pay UPI',
  upi_id: 'UPI ID',
};

const BRAND_ACCENT = '#3E21E0';

interface UpiOption {
  id: PaymentMethod;
  label: string;
  icon: IconSvgElement;
  badgeBg: string;
  badgeText: string;
}

const UPI_APP_OPTIONS: UpiOption[] = [
  { id: 'google_pay', label: 'Google Pay', icon: BankIcon, badgeBg: '#E8F0FE', badgeText: '#1A73E8' },
  { id: 'phonepe', label: 'PhonePe UPI', icon: SmartPhone01Icon, badgeBg: '#F1E9FE', badgeText: '#5F259F' },
  { id: 'amazon_pay', label: 'Amazon Pay UPI', icon: Wallet01Icon, badgeBg: '#FFF3E0', badgeText: '#CC7A00' },
];

const UPI_ID_OPTION: UpiOption = { id: 'upi_id', label: 'Pay via UPI ID', icon: AtIcon, badgeBg: '#EDE9FE', badgeText: BRAND_ACCENT };

function RadioCheck({ selected }: { selected: boolean }) {
  if (!selected) return <View className="h-6 w-6 rounded-full border-2 border-gray-300" />;
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_ACCENT }}>
      <AppIcon icon={Tick02Icon} size={13} color="#FFFFFF" />
    </View>
  );
}

// Prefers a real brand icon (PAYMENT_METHOD_ICON_URL) when one's set —
// shown large on a plain white, bordered tile so the brand's own colors
// carry the badge instead of a tinted background fighting with them. Falls
// back to the in-app tinted hugeicon (its own colored tile) when a method
// has no real logo yet, so it still reads as deliberate rather than broken.
function AppBadge({ method, icon, bg, iconColor }: { method: PaymentMethod; icon: IconSvgElement; bg: string; iconColor: string }) {
  const iconUrl = PAYMENT_METHOD_ICON_URL[method];
  if (iconUrl) {
    return (
      <View className="h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white">
        <Image source={{ uri: iconUrl }} className="h-7 w-7" resizeMode="contain" />
      </View>
    );
  }
  return (
    <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
      <AppIcon icon={icon} size={22} color={iconColor} />
    </View>
  );
}

// subtext sits under the button, not inside it — a short reassurance line
// (encryption/refund-safety) that makes tapping "Pay Now" feel like a safe
// default instead of a leap of faith, same spot Blinkit/Swiggy put theirs.
function PayButton({
  label,
  subtext,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  subtext?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="mt-4 gap-2">
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="items-center rounded-2xl py-4"
        style={{ backgroundColor: disabled ? '#3E21E080' : BRAND_ACCENT }}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[15px] font-medium text-white">{label}</Text>}
      </Pressable>
      {subtext ? <Text className="text-center text-[11.5px] text-ink/40">{subtext}</Text> : null}
    </View>
  );
}

interface Props {
  method: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onPay: () => void;
  totalPrice: number;
  isPlacingOrder?: boolean;
}

export function PaymentMethodList({ method, onSelect, onPay, totalPrice, isPlacingOrder }: Props) {
  const [upiId, setUpiId] = useState('');
  const codSelected = method === 'cod';
  const upiIdSelected = method === 'upi_id';
  const upiIdValid = upiId.trim().length >= 4 && upiId.includes('@');

  return (
    <View className="mt-4 gap-6">
      <View>
        <Text className="mb-2 px-1 text-[16px] font-medium text-ink mb-4">Pay When It Arrives</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => onSelect('cod')} className="flex-row items-center gap-3">
            <AppBadge method="cod" icon={BanknoteIcon} bg="#E4F6EC" iconColor="#1E9E5C" />
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Cash / Pay on Delivery</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50">Keep exact change ready for the rider.</Text>
            </View>
            <RadioCheck selected={codSelected} />
          </Pressable>

          {codSelected ? (
            <PayButton
              label={isPlacingOrder ? 'Placing order…' : `Pay ₹${totalPrice} with Cash`}
              subtext="Nothing charged now, pay the rider on delivery"
              loading={isPlacingOrder}
              onPress={onPay}
            />
          ) : null}
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[16px] font-medium text-ink">Pay Instantly with UPI</Text>
        <View className="overflow-hidden rounded-2xl bg-white">
          {UPI_APP_OPTIONS.map((option, index) => {
            const isSelected = method === option.id;
            const isLast = index === UPI_APP_OPTIONS.length - 1 && !isSelected;
            return (
              <View key={option.id} className={isLast ? '' : 'border-b border-dashed border-gray-200'}>
                <Pressable onPress={() => onSelect(option.id)} className="flex-row items-center gap-3 px-4 py-4">
                  <AppBadge method={option.id} icon={option.icon} bg={option.badgeBg} iconColor={option.badgeText} />
                  <Text className="flex-1 text-[15px] font-medium text-ink">{option.label}</Text>
                  <RadioCheck selected={isSelected} />
                </Pressable>
                {isSelected ? (
                  <View className="px-4 pb-4">
                    <PayButton
                      label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
                      subtext={`Secured checkout with ${option.label}`}
                      loading={isPlacingOrder}
                      onPress={onPay}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          <View>
            <Pressable onPress={() => onSelect('upi_id')} className="flex-row items-center gap-3 px-4 py-4">
              <AppBadge method={UPI_ID_OPTION.id} icon={UPI_ID_OPTION.icon} bg={UPI_ID_OPTION.badgeBg} iconColor={UPI_ID_OPTION.badgeText} />
              <Text className="flex-1 text-[15px] font-medium text-ink">{UPI_ID_OPTION.label}</Text>
              <RadioCheck selected={upiIdSelected} />
            </Pressable>

            {upiIdSelected ? (
              <View className="gap-3 px-4 pb-4">
                <View className="gap-1">
                  <TextInput
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="yourname@bank"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="rounded-xl border border-gray-200 bg-mist px-4 py-3 text-[15px] font-medium text-ink"
                  />
                  <Text className="px-1 text-[11.5px] text-ink/40">We'll send a payment request straight to this UPI ID.</Text>
                </View>
                <PayButton
                  label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
                  subtext="Secured checkout via UPI"
                  disabled={!upiIdValid}
                  loading={isPlacingOrder}
                  onPress={onPay}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
