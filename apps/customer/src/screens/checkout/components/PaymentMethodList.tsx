// Three sections — "Pay on Delivery" (Cash), a UPI-app grid built from
// whatever's actually detected installed on this device (payments/
// upiIntent.ts's detectInstalledUpiApps), and "More payment options"
// (cards/netbanking/any other UPI app) falling back to Razorpay's own
// bundled Checkout screen. The UPI grid is Flikk's own screen, own icons,
// own tap targets — no Razorpay/Cashfree branding shown at any point in
// it, same as Blinkit/Instamart's own checkout. See payments/upiIntent.ts
// for how a tapped app is actually launched.
//
// PaymentMethod encodes a chosen UPI app as `upi_app:<id>` rather than a
// separate field — keeps CheckoutScreen's handlePay a single switch on
// one value instead of two independent pieces of state that could
// disagree (e.g. method='online' with a stale selectedUpiApp left over
// from a previous tap).
//
// `upiApps` (the detected list) is a prop, not detected here internally
// — CheckoutScreen owns detection and passes the same list down that it
// looks the tapped app up in for handlePay. Two independent detection
// calls (one here, one there) risk two different results if apps get
// installed/uninstalled between them — id `upi_app:<packageName>` would
// then resolve here but fail to find a match in CheckoutScreen's own
// list, which is exactly the "Unknown UPI app selected" bug this fixes.

import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { BankIcon, BanknoteIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import type { UpiApp } from '../../../payments/upiApps';

export type PaymentMethod = 'cod' | 'online' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, upiApps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'online') return 'Online Payment';
  const appId = method.slice('upi_app:'.length);
  return upiApps.find((a) => a.id === appId)?.name ?? 'UPI';
}

const BRAND_ACCENT = '#3E21E0';

function RadioCheck({ selected }: { selected: boolean }) {
  if (!selected) return <View className="h-6 w-6 rounded-full border-2 border-gray-300" />;
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_ACCENT }}>
      <AppIcon icon={Tick02Icon} size={13} color="#FFFFFF" />
    </View>
  );
}

function AppBadge({ icon, bg, iconColor }: { icon: typeof BankIcon; bg: string; iconColor: string }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
      <AppIcon icon={icon} size={22} color={iconColor} />
    </View>
  );
}

// Android: app.iconUri is the real launcher icon, read straight off the
// device's own PackageManager (payments/upiIntent.ts, UpiAppsModule.kt) —
// not a fetched/external asset. iOS has no iconUri (no API to fetch
// another app's icon) — falls back to a brand-colored circle + initial,
// still tied to a genuinely installed, genuinely launchable app, never a
// fabricated placeholder.
function UpiAppBadge({ app }: { app: UpiApp }) {
  if (app.iconUri) {
    return <Image source={{ uri: app.iconUri }} className="h-12 w-12 rounded-xl" />;
  }
  return (
    <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: app.color }}>
      <Text className="text-lg font-extrabold text-white">{app.name.charAt(0)}</Text>
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
  upiApps: UpiApp[];
}

export function PaymentMethodList({ method, onSelect, onPay, totalPrice, isPlacingOrder, upiApps }: Props) {
  const codSelected = method === 'cod';
  const onlineSelected = method === 'online';
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;

  return (
    <View className="mt-4 gap-6">
      <View>
        <Text className="mb-2 px-1 text-[16px] font-medium text-ink mb-4">Pay When It Arrives</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => onSelect('cod')} className="flex-row items-center gap-3">
            <AppBadge icon={BanknoteIcon} bg="#E4F6EC" iconColor="#1E9E5C" />
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

      {upiApps.length > 0 && (
        <View>
          <Text className="mb-2 px-1 text-[16px] font-medium text-ink">Pay via UPI</Text>
          <View className="rounded-2xl bg-white p-4">
            {upiApps.map((app, index) => {
              const isSelected = selectedUpiAppId === app.id;
              const isLast = index === upiApps.length - 1;
              return (
                <View key={app.id} className={isLast ? '' : 'mb-3 border-b border-dashed border-gray-100 pb-3'}>
                  <Pressable onPress={() => onSelect(`upi_app:${app.id}`)} className="flex-row items-center gap-3">
                    <UpiAppBadge app={app} />
                    <Text className="flex-1 text-[15px] font-medium text-ink">{app.name}</Text>
                    <RadioCheck selected={isSelected} />
                  </Pressable>

                  {isSelected ? (
                    <PayButton
                      label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
                      subtext={`Opens ${app.name} to complete payment`}
                      loading={isPlacingOrder}
                      onPress={onPay}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View>
        <Text className="mb-2 px-1 text-[16px] font-medium text-ink">More Payment Options</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => onSelect('online')} className="flex-row items-center gap-3">
            <AppBadge icon={BankIcon} bg="#E8F0FE" iconColor="#1A73E8" />
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Cards, Netbanking & more</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50">
                {upiApps.length > 0 ? 'Or a UPI app not listed above.' : 'Includes UPI, if no app was detected above.'}
              </Text>
            </View>
            <RadioCheck selected={onlineSelected} />
          </Pressable>

          {onlineSelected ? (
            <PayButton
              label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
              subtext="Secured checkout via Razorpay"
              loading={isPlacingOrder}
              onPress={onPay}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
