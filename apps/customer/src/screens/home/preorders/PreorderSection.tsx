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

export function PreorderSection({ title, subtitle }: { title: string; subtitle: string | null }) {
  const { data } = usePreorders();
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  if (products.length === 0 || !data?.slots.length) return null;
  return (
    <View className="mt-8 py-7" style={{ backgroundColor: PLUM }}>
      <View className="px-5">
        <Text className="text-[24px] font-bold leading-[30px] tracking-tight text-white">{title}</Text>
        {subtitle ? <Text className="mt-1 text-[14px] text-white/70">{subtitle}</Text> : null}

        {/* The bookable days, like a cinema date strip: plain lowercase
            columns, today lifted into a white capsule. */}
        <View className="mt-5 flex-row">
          {bookingDates().map((date, i) => {
            const card = dayCard(date);
            const today = i === 0;
            return (
              <View key={date} className="flex-1 items-center">
                <View
                  className="items-center py-3"
                  style={{ width: 46, borderRadius: 23, backgroundColor: today ? '#FFFFFF' : 'transparent' }}
                >
                  <Text className="text-[12px] font-medium tracking-[0.3px]" style={{ color: today ? PLUM : 'rgba(255,255,255,0.6)' }}>{card.top}</Text>
                  <Text className="mt-0.5 text-[20px] font-semibold" style={{ color: today ? PLUM : '#FFFFFF' }}>{card.day}</Text>
                </View>
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
