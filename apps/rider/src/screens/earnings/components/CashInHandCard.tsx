// Cash the rider collected on cash-on-delivery orders and still holds
// (GET /rider/cash-balance). Shows how close they are to the cash limit, past
// which new cash orders are refused (backend lib/riderCashLimit.ts), and the
// unsettled collections so the rider can match what they hand over. The
// Gloceries team records the hand-over from the admin Cash on delivery page;
// this card clears on the next refresh.
import { Text, View } from 'react-native';
import { formatCash } from '../../../components/CollectCashBanner';
import type { RiderCashBalance } from '../../../api/earnings';

const SHOWN_COLLECTIONS = 5;

function collectedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function CashInHandCard({ balance }: { balance: RiderCashBalance }) {
  const limit = balance.limit ?? 0;
  const atLimit = limit > 0 && balance.outstanding >= limit;
  const share = limit > 0 ? Math.min(1, balance.outstanding / limit) : 0;
  const items = balance.items ?? [];

  return (
    <View className="mx-5 rounded-2xl bg-surge-soft px-4 py-3">
      <Text className="text-[15px] font-extrabold text-ink">Cash to hand over: ₹{formatCash(balance.outstanding)}</Text>
      {limit > 0 ? (
        <>
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <View className={`h-full rounded-full ${atLimit ? 'bg-danger' : 'bg-[#fe9a00]'}`} style={{ width: `${share * 100}%` }} />
          </View>
          <Text className={`mt-1 text-[12px] font-semibold ${atLimit ? 'text-danger' : 'text-ink/60'}`}>
            {atLimit
              ? `Cash limit of ₹${formatCash(limit)} reached. Hand over this cash to take cash orders again.`
              : `Limit ₹${formatCash(limit)}. Above it you can only take prepaid orders.`}
          </Text>
        </>
      ) : null}
      <Text className="mt-1 text-[12px] font-medium text-ink/60">
        Collected on {balance.count} cash-on-delivery {balance.count === 1 ? 'order' : 'orders'}. Hand it to the Gloceries team; it clears here once they record it.
      </Text>
      {items.slice(0, SHOWN_COLLECTIONS).map((item) => (
        <View key={item.id} className="mt-1.5 flex-row justify-between">
          <Text className="text-[12px] font-medium text-ink/60">{collectedLabel(item.collected_at)}</Text>
          <Text className="text-[12px] font-bold text-ink">₹{formatCash(item.amount)}</Text>
        </View>
      ))}
      {items.length > SHOWN_COLLECTIONS ? (
        <Text className="mt-1 text-[12px] font-medium text-ink/50">and {items.length - SHOWN_COLLECTIONS} more</Text>
      ) : null}
    </View>
  );
}
