// Home "Pre-orders" panel (admin Home Sections key 'preorders'): the only place
// pre-order products appear. A full-width plum band with the heading, the
// five bookable days, and the products deliverable on the chosen day as a
// rail. Tapping a day filters the rail by each product's notice and opens the
// product sheet on that day (usePreorderDayStore). ADD opens the sheet, where
// the customer confirms the day and picks a slot (mustPickInDetail).
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { bookingDates, dayCard, dayOpen, daysAhead } from '../../../store/preorder';
import { usePreorderDayStore } from '../../../store/usePreorderDayStore';
import { usePreorders } from './usePreorders';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
const PLUM = '#4A2C5A';

export function PreorderSection({ title, subtitle }: { title: string; subtitle: string | null }) {
  const { data } = usePreorders();
  const storedDay = usePreorderDayStore((s) => s.day);
  const setDay = usePreorderDayStore((s) => s.setDay);
  const products = (data?.products ?? []).filter((p) => p.isAvailable !== false);
  const slots = data?.slots ?? [];
  if (products.length === 0 || slots.length === 0) return null;

  const dates = bookingDates();
  // A day with no slot left (e.g. today late evening) can't be picked.
  const open = dates.filter((d) => dayOpen(d, 0, slots));
  const deliverable = (d: string) => products.some((p) => daysAhead(d) >= (p.preorder?.leadDays ?? 0));
  // Start on the first day that has something to book.
  const day = storedDay && open.includes(storedDay) ? storedDay : open.find(deliverable) ?? open[0];
  const ahead = day ? daysAhead(day) : 0;
  const forDay = products.filter((p) => ahead >= (p.preorder?.leadDays ?? 0));

  return (
    <View className="mt-8 py-7" style={{ backgroundColor: PLUM }}>
      <View className="px-5">
        <Text className="text-[26px] font-bold tracking-tight text-white">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[15px] text-white/70">{subtitle}</Text> : null}

        <View className="mt-5 flex-row" style={{ gap: 8 }}>
          {dates.map((date) => {
            const card = dayCard(date);
            const enabled = open.includes(date);
            const selected = date === day;
            return (
              <Pressable
                key={date}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !enabled }}
                accessibilityLabel={`${card.top} ${card.day} ${card.month}`}
                disabled={!enabled}
                onPress={() => setDay(date)}
                className="flex-1 items-center rounded-[12px] bg-white py-2.5"
                style={{ opacity: enabled ? 1 : 0.4 }}
              >
                <Text className="text-[10px] font-semibold uppercase tracking-[0.8px]" style={{ color: selected ? PLUM : '#8A8494' }}>{card.top}</Text>
                <Text className="mt-0.5 text-[19px] font-bold" style={{ color: selected ? PLUM : '#2B2433' }}>{card.day}</Text>
                {/* The chosen day. */}
                <View className="mt-1 h-[3px] w-4 rounded-full" style={{ backgroundColor: selected ? PLUM : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {forDay.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-start gap-2.5 px-5 pt-5"
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {forDay.map((product) => (
            <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} onDark />
          ))}
        </ScrollView>
      ) : (
        <Text className="px-5 pt-5 text-[14px] text-white/70">These items need more notice. Pick a later day.</Text>
      )}
    </View>
  );
}
