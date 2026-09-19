// Three sections — a UPI-app grid built from whatever's actually detected
// installed on this device (payments/upiIntent.ts's detectInstalledUpiApps),
// Card, and "Pay on Delivery" (Cash). Card falls back to Razorpay's own
// bundled Checkout screen, which already includes netbanking/wallets/any
// other UPI app inside its own UI — no separate "Netbanking" row here,
// that would just duplicate what tapping Card already reaches. The UPI
// grid is Flikk's own screen, own icons, own tap targets — no Razorpay/
// Cashfree branding shown at any point in it, same as Blinkit/Instamart's
// own checkout. See payments/upiIntent.ts for how a tapped app is
// actually launched.
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
//
// "Pay via UPI ID" (type-a-VPA) is real, but not what it looks like at a
// glance — NPCI retired UPI Collect industry-wide (backend/src/payments/
// verifyPayoutAccount.ts's own note), so there is no mechanism left, on
// any provider, to push a payment request into that VPA's own app
// automatically. Typing a VPA here and tapping Verify calls POST
// /payments/verify-upi-id, a real RazorpayX Fund Account Validation (a
// genuine ~₹1 penny-drop, not a regex guess) that confirms the ID
// actually resolves to a real account and surfaces its real registered
// name — this is an identity check, not a payment. Only once that
// succeeds does Pay Now appear, and tapping it does exactly what an
// app-grid tap does (payments/upiIntent.ts's own createUpiIntentPayment +
// PaymentProcessingScreen), except the launch targets no specific
// package (openUpiId in CheckoutScreen.tsx) since a typed VPA doesn't
// say which installed app owns it — the OS's own UPI chooser (or direct
// launch if only one app matches) is the honest behavior here, not a bug
// the way it was for a specific app-grid tap.
//
// No fake "Google Pay" preview row either when nothing's detected
// installed — that used to render this app's own real UPI_APPS[0] entry
// as a fake selectable row even on a device with no UPI apps at all,
// which both mislabeled a phone with no UPI apps AND, if tapped, silently
// fell through to Standard Checkout under a Google Pay label it never
// actually used. A device with nothing detected gets a real empty-state
// message instead, pointing at Card below (Razorpay's own Standard
// Checkout, which bundles UPI/netbanking/wallets in its own picker) —
// the only path that's actually guaranteed to work there.

import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { CreditCardIcon, Tick01Icon, CheckmarkCircle02Icon, Alert02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { verifyUpiId } from '../../../api/payments';
import type { UpiApp } from '../../../payments/upiApps';

const CASH_ICON_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/icons/Cash.png';

export type PaymentMethod = 'cod' | 'online' | 'card' | 'upi_id' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, upiApps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'online') return 'Online Payment';
  if (method === 'card') return 'Card';
  if (method === 'upi_id') return 'UPI ID';
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

function AppBadge({ icon }: { icon: typeof CreditCardIcon }) {
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
    return <Image source={{ uri: app.iconUri }} className="h-12 w-12" />;
  }
  return (
    <View className="h-12 w-12 items-center justify-center" style={{ backgroundColor: app.color }}>
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
  const upiIdSelected = method === 'upi_id';
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;

  // Entirely local — CheckoutScreen only ever needs to know method ===
  // 'upi_id' AND that this state is 'verified' before Pay Now can fire
  // (the onPay prop is gated below, so a stale/expired verification can't
  // reach handlePay). Reset whenever the typed VPA changes, since a
  // verification result belongs to the exact string it was run against,
  // not to whatever's in the box now.
  const [vpaInput, setVpaInput] = useState('');
  const [verification, setVerification] = useState<
    { status: 'idle' } | { status: 'verifying' } | { status: 'verified'; accountHolderName: string | null } | { status: 'error'; message: string }
  >({ status: 'idle' });

  function onChangeVpa(text: string) {
    setVpaInput(text);
    if (verification.status !== 'idle') setVerification({ status: 'idle' });
    if (upiIdSelected) onSelect(null);
  }

  async function handleVerify() {
    setVerification({ status: 'verifying' });
    try {
      const result = await verifyUpiId(vpaInput.trim());
      setVerification({ status: 'verified', accountHolderName: result.accountHolderName });
      onSelect('upi_id');
    } catch (err) {
      setVerification({ status: 'error', message: err instanceof Error ? err.message : 'Could not verify this UPI ID.' });
    }
  }

  return (
    <View className="mt-6 gap-6">
      {upiApps.length > 0 ? (
        <View>
          <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Recommended</Text>
          <View className="bg-white p-4" style={{ borderRadius: 12 }}>
            {upiApps.map((app, index) => {
              const isSelected = selectedUpiAppId === app.id;
              const isLast = index === upiApps.length - 1;
              return (
                <View key={app.id} className={isLast ? '' : 'mb-3 border-b border-dashed border-gray-100 pb-3'}>
                  <Pressable onPress={() => toggle(`upi_app:${app.id}`)} className="flex-row items-center gap-3">
                    <UpiAppBadge app={app} />
                    <View className="flex-1 flex-row items-center gap-2">
                      <Text className="text-[15px] font-medium text-ink">{app.name}</Text>
                      {/* Detection order (payments/upiApps.ts's UPI_APPS list)
                          is already priority-ranked by real-world UPI-app
                          market share in India — the first entry that's
                          actually installed on this device is the one worth
                          calling out, not an arbitrary/alphabetical pick. */}
                      {index === 0 ? (
                        <View className="rounded-full bg-blue-50 px-2 py-0.5">
                          <Text className="text-[10.5px] font-semibold uppercase tracking-wide text-[#155dfc]">Recommended</Text>
                        </View>
                      ) : null}
                    </View>
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
            })}
          </View>
        </View>
      ) : (
        // Nothing real detected on this device (payments/upiIntent.ts) —
        // no UPI app to launch via Intent, so there's genuinely nothing
        // to list here. Card below still pays via UPI (Razorpay's own
        // Standard Checkout bundles a UPI picker/QR inside itself), so
        // this points there instead of faking a selectable UPI row that
        // doesn't correspond to anything installed.
        <View className="rounded-xl bg-gray-50 px-4 py-3">
          <Text className="text-[13.5px] font-medium text-ink/60">
            No UPI apps detected on this device. Use Card below to pay via UPI, netbanking, or card.
          </Text>
        </View>
      )}

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay via UPI ID</Text>
        <View className="bg-white p-4" style={{ borderRadius: 12 }}>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={vpaInput}
              onChangeText={onChangeVpa}
              placeholder="yourname@bank"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              editable={verification.status !== 'verifying'}
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-[14.5px] font-medium text-ink"
            />
            {verification.status === 'verified' ? (
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-success/10">
                <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.success} />
              </View>
            ) : (
              <Pressable
                onPress={handleVerify}
                disabled={vpaInput.trim().length < 3 || verification.status === 'verifying'}
                className="items-center justify-center rounded-xl px-4 py-3"
                style={{ backgroundColor: vpaInput.trim().length < 3 ? '#93b4fb' : BRAND_ACCENT }}
              >
                {verification.status === 'verifying' ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-[13.5px] font-semibold text-white">Verify</Text>
                )}
              </Pressable>
            )}
          </View>

          {verification.status === 'verified' ? (
            <Text className="mt-2 text-[12.5px] font-medium text-success">
              Verified{verification.accountHolderName ? ` · ${verification.accountHolderName}` : ''}
            </Text>
          ) : null}
          {verification.status === 'error' ? (
            <View className="mt-2 flex-row items-start gap-1.5">
              <AppIcon icon={Alert02Icon} size={14} color={colors.danger} />
              <Text className="flex-1 text-[12.5px] font-medium text-danger">{verification.message}</Text>
            </View>
          ) : null}
          {verification.status === 'idle' ? (
            <Text className="mt-2 text-[12px] font-medium text-ink/40">
              We verify this is a real UPI ID first — you will still complete the payment yourself in your UPI app, same as tapping an
              app above.
            </Text>
          ) : null}

          {upiIdSelected && verification.status === 'verified' ? (
            <PayButton
              label={isPlacingOrder ? 'Placing order…' : `Pay Now · ₹${totalPrice}`}
              loading={isPlacingOrder}
              onPress={onPay}
            />
          ) : null}
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Card</Text>
        <View className="bg-white p-4" style={{ borderRadius: 12 }}>
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
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay on Delivery</Text>
        <View className="bg-white p-4 mt-1" style={{ borderRadius: 12 }}>
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
