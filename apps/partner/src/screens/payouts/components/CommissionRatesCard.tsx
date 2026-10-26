// What Gloceries charges on this store's new orders (GET /partner/commission).
// With category rates: one row per rate listing its categories, the rate for
// any other category, and the per-order cap. With the store's own rate (or an
// older backend): that one rate on the item total.

import { Text, View } from 'react-native';
import { formatCommissionPercent, groupCommissionRates, type PartnerCommission } from '../../../api/payouts';

interface Props {
  commission: PartnerCommission;
}

export function CommissionRatesCard({ commission }: Props) {
  const groups = commission.isStoreOverride ? [] : groupCommissionRates(commission.categoryRates ?? []);
  const cap = commission.capPerOrder;

  return (
    <View className="gap-3 rounded-3xl bg-white p-5">
      <Text className="text-[15px] font-semibold text-ink">Gloceries commission</Text>
      {groups.length === 0 ? (
        <Text className="text-[13px] font-medium leading-5 text-ink/60">
          {formatCommissionPercent(commission.commissionRate)} of the item total on each new order
          {commission.isStoreOverride ? ' (your store’s rate)' : ''}.
        </Text>
      ) : (
        <>
          <Text className="text-[13px] font-medium leading-5 text-ink/60">
            Charged on each item by its category:
          </Text>
          {groups.map((group) => (
            <View key={group.rate} className="flex-row gap-3">
              <Text className="w-12 text-[14px] font-semibold text-ink">{formatCommissionPercent(group.rate)}</Text>
              <Text className="flex-1 text-[13px] font-medium leading-5 text-ink/70">{group.categories.join(', ')}</Text>
            </View>
          ))}
          <View className="flex-row gap-3">
            <Text className="w-12 text-[14px] font-semibold text-ink">{formatCommissionPercent(commission.commissionRate)}</Text>
            <Text className="flex-1 text-[13px] font-medium leading-5 text-ink/70">Any other category</Text>
          </View>
        </>
      )}
      {cap != null && (
        <Text className="text-[12.5px] font-medium text-ink/55">
          Never more than ₹{cap.toLocaleString('en-IN')} commission on one order.
        </Text>
      )}
    </View>
  );
}
