// Home "Pre-orders" panel (admin Home Sections key 'preorders'): the only place
// pre-order products appear. A full-width plum band with the heading, the
// five bookable days, and the products as a rail. ADD opens the product sheet,
// where the customer picks a day and slot (mustPickInDetail).
import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { bookingDates, dayCard } from '../../../store/preorder';
import { usePreorders } from './usePreorders';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
const PLUM = '#4A2C5A';
const GOLD = '#E8C27A';

export function PreorderSection({ title, subtitle }: { title: string; subtitle: string | null }) {
  const { data } = usePreorders();
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  if (products.length === 0 || !data?.slots.length) return null;
  return (
    <View className="mt-8 py-7" style={{ backgroundColor: PLUM }}>
      <View className="px-5">
        <Text className="text-[24px] font-bold leading-[30px] tracking-tight text-white">{title}</Text>
        {subtitle ? <Text className="mt-1 text-[14px] text-white/70">{subtitle}</Text> : null}

        {/* The bookable days, like a cinema date strip. */}
        <View className="mt-5 flex-row" style={{ gap: 8 }}>
          {bookingDates().map((date, i) => {
            const card = dayCard(date);
            return (
              <View
                key={date}
                className="flex-1 items-center rounded-[14px] py-2"
                style={{
                  backgroundColor: i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: i === 0 ? GOLD : 'rgba(255,255,255,0.18)',
                }}
              >
                <Text className="text-[10px] font-semibold uppercase tracking-[0.5px]" style={{ color: i === 0 ? PLUM : GOLD }}>{card.top}</Text>
                <Text className="text-[18px] font-bold" style={{ color: i === 0 ? PLUM : '#FFFFFF' }}>{card.day}</Text>
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
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} onDark />
        ))}
      </ScrollView>
    </View>
  );
}
