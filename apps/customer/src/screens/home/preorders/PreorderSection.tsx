// Home "Pre-orders" panel (admin Home Sections key 'preorders'): the only place
// pre-order products appear. A dark gradient panel with the heading, the five
// bookable days, and the products as a rail. ADD opens the product sheet,
// where the customer picks a day and slot (mustPickInDetail).
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { bookingDates, dayCard } from '../../../store/preorder';
import { usePreorders } from './usePreorders';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;

export function PreorderSection({ title, subtitle }: { title: string; subtitle: string | null }) {
  const { data } = usePreorders();
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  if (products.length === 0 || !data?.slots.length) return null;
  return (
    <View className="px-4 pt-8">
      <LinearGradient
        colors={['#0B1B4D', '#132E7A', '#1D46B8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28, overflow: 'hidden', paddingVertical: 20 }}
      >
        <View className="px-5">
          <View className="self-start rounded-full bg-[#D9A441] px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink">Pre-order · Bulk</Text>
          </View>
          <Text className="mt-2.5 text-[24px] font-bold text-white">{title}</Text>
          {subtitle ? <Text className="mt-1 text-[13px] leading-[18px] text-white/70">{subtitle}</Text> : null}

          {/* The bookable days, like a cinema date strip. */}
          <View className="mt-4 flex-row" style={{ gap: 6 }}>
            {bookingDates().map((date, i) => {
              const card = dayCard(date);
              return (
                <View key={date} className="flex-1 items-center rounded-[12px] py-1.5"
                  style={{ backgroundColor: i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.12)' }}>
                  <Text className="text-[9px] font-semibold uppercase" style={{ color: i === 0 ? '#155DFC' : '#FFFFFFB3' }}>{card.top}</Text>
                  <Text className="text-[16px] font-bold" style={{ color: i === 0 ? '#101C10' : '#FFFFFF' }}>{card.day}</Text>
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

        <Text className="mt-3 px-5 text-[12px] text-white/60">Tap an item to pick your day and time slot.</Text>
      </LinearGradient>
    </View>
  );
}
