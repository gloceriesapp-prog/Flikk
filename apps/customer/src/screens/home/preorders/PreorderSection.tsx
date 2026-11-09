// Home "Pre-orders" panel (admin Home Sections key 'preorders'): the only place
// pre-order products appear. A full-width lavender band with the heading, the
// five bookable days, and the products deliverable on the chosen day as a
// rail. Tapping a day filters the rail by each product's notice and opens the
// product sheet on that day (usePreorderDayStore). ADD opens the sheet, where
// the customer confirms the day and picks a slot (mustPickInDetail).
import { Pressable, ScrollView, Text, View } from 'react-native';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { ProductCard } from '../products/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { bookingDates, dayCard, dayOpen, daysAhead } from '../../../store/preorder';
import { usePreorderDayStore } from '../../../store/usePreorderDayStore';
import { usePreorders } from './usePreorders';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
const LAVENDER = '#F3EEFF';
const INK = '#101C10';

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
    <View className="mt-8 pb-7 pt-6" style={{ backgroundColor: LAVENDER }}>
      {/* Same heading as every other Home section. */}
      <SectionTitle subtitle={subtitle ?? undefined}>{title}</SectionTitle>
      <View className="px-5">
        <View className="flex-row" style={{ gap: 8 }}>
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
                className="flex-1 items-center rounded-[14px] border py-2.5"
                style={{
                  backgroundColor: selected ? INK : '#FFFFFF',
                  borderColor: selected ? INK : '#E4DCF5',
                  opacity: enabled ? 1 : 0.4,
                }}
              >
                <Text className="text-[10px] font-semibold uppercase tracking-[0.8px]" style={{ color: selected ? '#FFFFFFB3' : '#6B7280' }}>{card.top}</Text>
                <Text className="mt-0.5 text-[18px] font-bold" style={{ color: selected ? '#FFFFFF' : INK }}>{card.day}</Text>
                <Text className="text-[10px] font-medium uppercase" style={{ color: selected ? '#FFFFFFB3' : '#9CA3AF' }}>{card.month}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {forDay.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-start gap-2.5 px-5 pt-5"
            snapToInterval={CARD_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {forDay.map((product) => (
              <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} />
            ))}
          </ScrollView>
          <HomeProductCollectionButton label="See all pre-orders" title={title} products={forDay} />
        </>
      ) : (
        <Text className="px-5 pt-5 text-[14px] text-ink/60">These items need more notice. Pick a later day.</Text>
      )}
    </View>
  );
}
