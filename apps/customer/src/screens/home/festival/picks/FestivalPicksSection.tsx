// Optional admin-curated festival shelf. Retained separately from the greeting rail.
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { ProductCard } from '../../products/ProductCard';
import { useFestivalSection } from './useFestivalSection';

export function FestivalPicksSection() {
  const { data: section } = useFestivalSection();
  if (!section || section.products.length === 0) return null;

  const visibleProducts = section.products.slice(0, 6);

  return (
    <View className="pb-6">
      <View className="gap-1 px-5 pb-4">
        <Text className="text-[19px] font-semibold text-white">{section.title}</Text>
      </View>

      {/* items-start — a horizontal ScrollView's content container
          defaults to stretch on the cross axis, which is exactly what
          blew the "See All" card up to the full screen height (h-full
          resolved against that stretched, effectively-unbounded
          container, not the product cards beside it). Sizing every child
          to its own content, then giving "See All" the same fixed height
          as a product card's own square image (h-36) instead of h-full,
          is what actually keeps it card-sized. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-4 px-5">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-32" showDiscountBadge />
        ))}

        <Pressable className="h-32 w-32 items-center justify-center gap-1.5 rounded-2xl bg-[#EEF2FF]">
          <Text className="text-[13px] font-bold text-[#2457F5]">See All</Text>
          <AppIcon icon={ArrowRight02Icon} size={16} color="#2457F5" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
