import { Text, View } from 'react-native';
import { useCategoryWindows, useDeliveryEstimateMinutes } from '../../../../api/deliverySettings';
import { deliveryWindowFor, formatWindow } from '../../../../utils/deliveryWindow';

// Top of a category page whose products take longer (Settings → Delivery
// time by category): "Delivery 45–60 mins · cut fresh", so the longer time
// is clear before anything goes in the cart. Nothing when it's the normal time.
export function CategoryDeliveryNote({ categories }: { categories: string[] }) {
  const base = useDeliveryEstimateMinutes();
  const window = deliveryWindowFor(categories, base, useCategoryWindows());
  if (!window.category) return null;
  return (
    <View className="mx-4 mb-3 flex-row items-center self-start rounded-full bg-[#FEF3C7] px-3 py-1.5" testID="category-delivery-note">
      <Text className="text-[12px] font-semibold text-[#92400E]">Delivery {formatWindow(window)}{window.note ? ` · ${window.note}` : ''}</Text>
    </View>
  );
}

// The Meat page's own product categories ('Non Veg' holds every meat/fish
// product today). ponytail: fixed list; add a name here if meat moves to a
// new category, or read it from the tab's content if that grows.
export const MEAT_CATEGORIES = ['Non Veg', 'Meat', 'Chicken', 'Fish', 'Mutton', 'Meat & Fish'];
