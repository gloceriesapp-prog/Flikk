// Original payment groups and card styling, with selection-only actions.
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { CreditCardIcon, ArrowRight01Icon, CheckmarkCircle02Icon, Alert02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { verifyUpiId } from '../../../api/payments';
import type { UpiApp } from '../../../payments/upiApps';

import type { PaymentMethod } from '../../../payments/paymentMethod';

const CASH_ICON_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/icons/Cash.png';


const BRAND_ACCENT = '#155dfc';

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
}

export function PaymentMethodList({ method, onSelect, upiApps }: Props) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const selectedUpiAppId = method?.startsWith('upi_app:') ? method.slice('upi_app:'.length) : null;

  const [vpaInput, setVpaInput] = useState('');
  const [verification, setVerification] = useState<
    { status: 'idle' } | { status: 'verifying' } | { status: 'verified'; accountHolderName: string | null } | { status: 'error'; message: string }
  >({ status: 'idle' });

  function onChangeVpa(text: string) {
    setVpaInput(text);
    if (verification.status !== 'idle') setVerification({ status: 'idle' });
  }

  async function handleVerify() {
    setVerification({ status: 'verifying' });
    try {
      const result = await verifyUpiId(vpaInput.trim());
      if (!mounted.current) return;
      setVerification({ status: 'verified', accountHolderName: result.accountHolderName });
      onSelect('upi_id');
    } catch (err) {
      if (mounted.current) setVerification({ status: 'error', message: err instanceof Error ? err.message : 'Could not verify this UPI ID.' });
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
                  <Pressable onPress={() => onSelect(`upi_app:${app.id}`)} className="flex-row items-center gap-3">
                    <UpiAppBadge app={app} />
                    <View className="flex-1 flex-row items-center gap-2">
                      <Text className="text-[15px] font-medium text-ink">{app.name}</Text>
                      
                      {index === 0 ? (
                        <View className="rounded-full bg-blue-50 px-2 py-0.5">
                          <Text className="text-[10.5px] font-semibold uppercase tracking-wide text-[#155dfc]">Recommended</Text>
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
      ) : (
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
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Card</Text>
        <View className="bg-white p-4" style={{ borderRadius: 12 }}>
          <Pressable onPress={() => onSelect('card')} className="flex-row items-center gap-3">
            <AppBadge icon={CreditCardIcon} />
            <Text className="flex-1 text-[15px] font-medium text-ink">Credit / Debit Card</Text>
            <SelectionArrow selected={method === 'card'} />
          </Pressable>
        </View>
      </View>

      <View>
        <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay on Delivery</Text>
        <View className="bg-white p-4 mt-1" style={{ borderRadius: 12 }}>
          <Pressable onPress={() => onSelect('cod')} className="flex-row items-center gap-3">
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
