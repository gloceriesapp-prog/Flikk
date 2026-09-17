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

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { BankIcon, CreditCardIcon, Tick01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { UPI_APPS, type UpiApp } from '../../../payments/upiApps';

const CASH_ICON_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/icons/Cash.png';
const UPI_ICON_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/icons/upi.svg';

// UI-preview only, not a real detected app — shown whenever nothing real
// came back from detectInstalledUpiApps (payments/upiIntent.ts), e.g. a
// simulator/dev build with no UPI apps installed, purely so this section's
// look can be reviewed. Selecting it behaves exactly like 'card'/
// 'netbanking' below (falls through to the generic checkout path) — it is
// never treated as a real `upi_app:` id, so it can never hit
// createUpiIntentPayment's real-app-id lookup in CheckoutScreen.
// This app's own real Google Pay entry (payments/upiApps.ts, used for real
// detection on-device) — reused here as-is, same id/color/scheme, purely
// to render a preview row when nothing was actually detected installed.
const SAMPLE_GOOGLE_PAY = UPI_APPS.find((app) => app.id === 'gpay')!;

export type PaymentMethod = 'cod' | 'online' | 'upi_id' | 'card' | 'netbanking' | 'upi_sample' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, upiApps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'online') return 'Online Payment';
  if (method === 'upi_id') return 'UPI ID';
  if (method === 'card') return 'Card';
  if (method === 'netbanking') return 'Netbanking';
  if (method === 'upi_sample') return SAMPLE_GOOGLE_PAY.name;
  const appId = method.slice('upi_app:'.length);
  return upiApps.find((a) => a.id === appId)?.name ?? 'UPI';
}

const BRAND_ACCENT = '#155dfc';

function RadioCheck({ selected }: { selected: boolean }) {
  if (!selected) return <View className="h-6 w-6 rounded-full border-2 border-gray-300" />;
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_ACCENT }}>
      <AppIcon icon={Tick01Icon} size={13} color="#FFFFFF" />
    </View>
  );
}

function AppBadge({ icon }: { icon: typeof BankIcon }) {
  return (
    <View className="h-12 w-12 items-center justify-center border border-gray-100">
      <AppIcon icon={icon} size={26} color={colors.ink} />
    </View>
  );
}

// Real brand icons (Cash/UPI), not hugeicons glyphs — same bordered box as
// AppBadge for a consistent tap-target/border look across every row here.
function ImageBadge({ uri }: { uri: string }) {
  return (
    <View className="h-12 w-12 items-center justify-center border border-gray-100">
      <AppImage source={{ uri }} contentFit="contain" style={{ width: 32, height: 32 }} />
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
        style={{ backgroundColor: disabled ? '#1447e6' : BRAND_ACCENT }}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[15px] font-semibold text-white">{label}</Text>}
      </Pressable>
      {subtext ? <Text className="text-center text-[11.5px] text-ink/40 font-medium">{subtext}</Text> : null}
    </View>
  );
}

interface Props {
  method: PaymentMethod | null;
  onSelect: (method: PaymentMethod | null) => void;
  onPay: () => void;
  totalPrice: number;
  isPlacingOrder?: boolean;
  upiApps: UpiApp[];
}

export function PaymentMethodList({ method, onSelect, onPay, totalPrice, isPlacingOrder, upiApps }: Props) {
  // Tapping an already-selected row again collapses it — every row below
  // goes through this instead of calling onSelect directly, so the tick
  // and the expanded Pay button both close together instead of the option
  // staying permanently selected once tapped once.
  function toggle(next: PaymentMethod) {
    onSelect(method === next ? null : next);
  }

  const codSelected = method === 'cod';
  const cardSelected = method === 'card';
  const netbankingSelected = method === 'netbanking';
  const upiIdSelected = method === 'upi_id';
  const upiSampleSelected = method === 'upi_sample';
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;
  // Sample UI only — no real VPA verification yet, this card gets wired up
  // once Razorpay's own UPI-collect API is configured. Kept local since
  // nothing outside this component needs the typed value right now.
  const [upiId, setUpiId] = useState('');

  return (
    <View className="mt-6 gap-6">
      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Recommended</Text>
        <View className="rounded-2xl bg-white p-4">
          {upiApps.length > 0 ? (
            upiApps.map((app, index) => {
              const isSelected = selectedUpiAppId === app.id;
              const isLast = index === upiApps.length - 1;
              return (
                <View key={app.id} className={isLast ? '' : 'mb-3 border-b border-dashed border-gray-100 pb-3'}>
                  <Pressable onPress={() => toggle(`upi_app:${app.id}`)} className="flex-row items-center gap-3">
                    <UpiAppBadge app={app} />
                    <Text className="flex-1 text-[15px] font-medium text-ink">{app.name}</Text>
                    <RadioCheck selected={isSelected} />
                  </Pressable>

                  {isSelected ? (
                    <PayButton
                      label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
                      loading={isPlacingOrder}
                      onPress={onPay}
                    />
                  ) : null}
                </View>
              );
            })
          ) : (
            // Nothing real detected on this device (payments/upiIntent.ts)
            // — a preview row so this section's look can still be checked,
            // using this app's own real Google Pay entry (UPI_APPS above).
            // Not wired to a real UPI-app launch; selecting it just falls
            // through to the same generic checkout path as 'card'/
            // 'netbanking' below.
            <Pressable onPress={() => toggle('upi_sample')} className="flex-row items-center gap-3">
              <UpiAppBadge app={SAMPLE_GOOGLE_PAY} />
              <Text className="flex-1 text-[15px] font-medium text-ink">{SAMPLE_GOOGLE_PAY.name}</Text>
              <RadioCheck selected={upiSampleSelected} />
            </Pressable>
          )}

          {upiSampleSelected ? (
            <PayButton label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`} loading={isPlacingOrder} onPress={onPay} />
          ) : null}
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Card</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => toggle('card')} className="flex-row items-center gap-3">
            <AppBadge icon={CreditCardIcon} />
            <Text className="flex-1 text-[15px] font-medium text-ink">Credit / Debit Card</Text>
            <RadioCheck selected={cardSelected} />
          </Pressable>

          {cardSelected ? (
            <PayButton label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`} loading={isPlacingOrder} onPress={onPay} />
          ) : null}
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay via UPI ID</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => toggle('upi_id')} className="flex-row items-center gap-3">
            <ImageBadge uri={UPI_ICON_URL} />
            <Text className="flex-1 text-[15px] font-medium text-ink">Enter UPI ID</Text>
            <RadioCheck selected={upiIdSelected} />
          </Pressable>

          {upiIdSelected ? (
            <View className="mt-4 gap-3">
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="yourname@upi"
                placeholderTextColor="#9AA5A3"
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="center"
                className="h-[52px] rounded-xl px-4 text-base text-ink font-medium"
                style={{ backgroundColor: '#FAFAFA' }}
              />
              <PayButton
                label={isPlacingOrder ? 'Placing order…' : `Verify & Pay · ₹${totalPrice}`}
                disabled={!upiId.trim()}
                loading={isPlacingOrder}
                onPress={onPay}
              />
            </View>
          ) : null}
        </View>
      </View>

      {/* <View> future 
        <Text className="mb-2 px-1 text-[16px] font-medium text-ink">Netbanking</Text>
        <View className="rounded-2xl bg-white p-4">
          <Pressable onPress={() => toggle('netbanking')} className="flex-row items-center gap-3">
            <AppBadge icon={BankIcon} />
            <Text className="flex-1 text-[15px] font-medium text-ink">Netbanking</Text>
            <RadioCheck selected={netbankingSelected} />
          </Pressable>

          {netbankingSelected ? (
            <PayButton label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`} loading={isPlacingOrder} onPress={onPay} />
          ) : null}
        </View>
      </View> */}

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay on Delivery</Text>
        <View className="rounded-2xl bg-white p-4 mt-1">
          <Pressable onPress={() => toggle('cod')} className="flex-row items-center gap-3">
            <ImageBadge uri={CASH_ICON_URL} />
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">Cash / Pay on Delivery</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink/50 font-medium">Keep exact change ready for the rider.</Text>
            </View>
            <RadioCheck selected={codSelected} />
          </Pressable>

          {codSelected ? (
            <PayButton
              label={isPlacingOrder ? 'Placing order…' : `Pay ₹${totalPrice} with Cash`}
              subtext="Nothing charged extra, pay the rider on delivery"
              loading={isPlacingOrder}
              onPress={onPay}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
