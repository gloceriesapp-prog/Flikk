// Cart-level coupon/promo code — the one thing previously missing next to
// this app's existing per-item discounts (CartScreen's own BillDetailsCard
// used to document this as explicitly out of scope; that's no longer
// true). POST /promos/validate (api/promos.ts) is a preview only — the
// real discount is always recomputed server-side at checkout
// (CheckoutScreen passes the same code through to createOrder/createTrip).

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { DiscountTag01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { validatePromoCode } from '../../../api/promos';
import { useCartStore, type AppliedPromo } from '../../../store/useCartStore';

interface Props {
  itemTotal: number;
  appliedPromo: AppliedPromo | null;
  // The server checkout quote's discount — the amount actually charged.
  // The validate preview is only shown until the first quote arrives.
  quotedDiscount?: number;
}

export function PromoCodeCard({ itemTotal, appliedPromo, quotedDiscount }: Props) {
  const setAppliedPromo = useCartStore((state) => state.setAppliedPromo);
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!code.trim() || isApplying) return;
    setIsApplying(true);
    setError(null);
    const result = await validatePromoCode(code.trim(), itemTotal);
    setIsApplying(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setAppliedPromo({ code: code.trim().toUpperCase(), discountAmount: result.discountAmount });
    setCode('');
  }

  return (
    <View className="rounded-2xl bg-white px-4 py-4">
      {appliedPromo ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={DiscountTag01Icon} size={16} color={colors.success} />
            <Text className="text-[13px] font-semibold text-success">
              {appliedPromo.code} applied — ₹{quotedDiscount ?? appliedPromo.discountAmount} off
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove promo code" onPress={() => setAppliedPromo(null)} hitSlop={8}>
            <AppIcon icon={Cancel01Icon} size={16} color={`${colors.ink}70`} />
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-2">
            <AppIcon icon={DiscountTag01Icon} size={16} color={`${colors.ink}70`} />
            <TextInput
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError(null);
              }}
              placeholder="Enter promo code"
              placeholderTextColor={`${colors.ink}55`}
              autoCapitalize="characters"
              className="flex-1 text-[13px] font-medium text-ink"
            />
            <Pressable
              onPress={handleApply}
              disabled={!code.trim() || isApplying}
              hitSlop={6}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{
                  color: !code.trim() || isApplying ? `${colors.ink}40` : '#155DFC',
                }}
              >
                {isApplying ? 'Checking…' : 'Apply'}
              </Text>
            </Pressable>
          </View>
          {error && <Text className="mt-1.5 text-[12px] font-medium text-danger">{error}</Text>}
        </>
      )}
    </View>
  );
}
