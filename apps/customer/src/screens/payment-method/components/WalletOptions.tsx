import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CreditCardIcon } from '@hugeicons/core-free-icons';
import { fetchAvailableWallets, type WalletOption } from '../../../api/payments';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import type { PaymentMethod } from '../../../payments/paymentMethod';
import { WalletAccountForm } from './WalletAccountForm';
import { colors, minTouchTarget } from '../../../theme/tokens';

function WalletLogo({ code }: { code: WalletOption['code'] }) {
  const [failed, setFailed] = useState(false);
  return <View className="h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white">
    {failed ? <AppIcon icon={CreditCardIcon} size={24} color={colors.ink} />
      : <AppImage source={{ uri: `https://cdn.razorpay.com/wallet/${code}.png` }}
        style={{ width: 34, height: 34 }} contentFit="contain" accessible={false} onError={() => setFailed(true)} />}
  </View>;
}

export function WalletOptions({ method, onSelect }: {
  method: PaymentMethod | null; onSelect: (method: PaymentMethod, contact: string) => void;
}) {
  const [expanded, setExpanded] = useState<WalletOption['code'] | null>(null);
  const query = useQuery({ queryKey: ['available-wallets'], queryFn: fetchAvailableWallets, retry: false, staleTime: 0 });
  const wallets = (query.data?.wallets ?? []).filter(wallet => wallet.code === 'mobikwik' || wallet.code === 'olamoney');
  return <View>
    <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Wallets</Text>
    <View className="rounded-xl bg-white p-4">
      {query.isPending ? <Text className="text-[13px] text-ink/60">Loading wallets…</Text>
        : query.isError ? <View>
          <Text className="text-[13px] text-ink/60">Couldn’t load wallets. Please try again.</Text>
          <Pressable onPress={() => void query.refetch()} accessibilityRole="button" style={{ minHeight: minTouchTarget, justifyContent: 'center' }}>
            <Text className="text-[14px] font-semibold text-ink">Retry wallets</Text>
          </Pressable>
        </View>
          : wallets.length === 0 ? <Text className="text-[13px] text-ink/60">Wallets are unavailable right now. Choose another payment method.</Text>
            : wallets.map((wallet, index) => {
              const value = `wallet:${wallet.code}` as PaymentMethod;
              const selected = value === method;
              const open = expanded === wallet.code;
              return <View key={wallet.code} className={index < wallets.length - 1 ? 'mb-3 border-b border-dashed border-gray-100 pb-3' : ''}>
                <View className="flex-row items-center gap-3" style={{ minHeight: minTouchTarget }}>
                  <WalletLogo code={wallet.code} />
                  <Text className="flex-1 text-[15px] font-medium text-ink">{wallet.name}</Text>
                  <Pressable onPress={() => setExpanded(open ? null : wallet.code)} accessibilityRole="button"
                    accessibilityLabel={`Link ${wallet.name} account`} accessibilityState={{ expanded: open, selected }}
                    className="min-h-11 justify-center pl-2">
                    <Text className="text-[13px] font-semibold" style={{ color: '#155DFC' }}>{open ? 'Cancel' : 'Link account'}</Text>
                  </Pressable>
                </View>
                {open && <WalletAccountForm key={wallet.code} walletName={wallet.name}
                  onContinue={contact => onSelect(value, contact)} />}

              </View>;
            })}
    </View>
  </View>;
}
