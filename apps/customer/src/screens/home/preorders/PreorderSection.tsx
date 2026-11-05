// Home "Pre-orders" panel (admin Home Sections key 'preorders'): the only place
// pre-order products appear. A full-width cream band with the heading, the
// five bookable days, and the products as a rail. ADD opens the product sheet,
// where the customer picks a day and slot (mustPickInDetail).
import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { bookingDates, dayCard } from '../../../store/preorder';
import { usePreorders } from './usePreorders';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
const CREAM = '#FBF6EE';
const GOLD = '#B8893B';

export function PreorderSection({ title, subtitle }: { title: string; subtitle: string | null }) {
  const { data } = usePreorders();
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  if (products.length === 0 || !data?.slots.length) return null;
  return (
    <View className="mt-8 py-7" style={{ backgroundColor: CREAM }}>
      <View className="px-5">
        <Text className="text-[26px] font-bold tracking-tight text-ink">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[15px] font-medium" style={{ color: GOLD }}>{subtitle}</Text> : null}

        {/* The bookable days, like a cinema date strip. */}
        <View className="mt-5 flex-row" style={{ gap: 8 }}>
          {bookingDates().map((date, i) => {
            const card = dayCard(date);
            return (
              <View
                key={date}
                className="flex-1 items-center rounded-[14px] py-2"
                style={{
                  backgroundColor: i === 0 ? '#FFFFFF' : 'transparent',
                  borderWidth: 1,
                  borderColor: i === 0 ? GOLD : '#EADFCB',
                }}
              >
                <Text className="text-[10px] font-semibold uppercase tracking-[0.5px]" style={{ color: i === 0 ? GOLD : '#9A8A70' }}>{card.top}</Text>
                <Text className="text-[18px] font-bold text-ink">{card.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-2.5 px-5 pt-5"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}
