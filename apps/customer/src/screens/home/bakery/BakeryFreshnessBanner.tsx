// Hero strip at the top of the Bakery tab — sets the trust cue this
// category actually sells on (freshness/bake-time), same idea as
// RegionalTab's own hero setting "local pride" before its first product
// row: the tab's emotional pitch comes first, not a product grid cold-
// opening the screen.
//
// Warm cream/toffee tone, not this app's usual blue/lavender/maroon —
// bakery reads as warm and inviting, a different visual register from
// Regional's terracotta local-pride banner or Seasonal's festive purple,
// same "each tab gets its own identity" idea those already established.

import { Text, View } from 'react-native';

export function BakeryFreshnessBanner() {
  return (
    <View className="mx-5 mt-4 gap-1.5 rounded-3xl px-5 py-5" style={{ backgroundColor: '#7A4A1E' }}>
      <Text className="text-[19px] font-extrabold leading-6 text-white">Baked fresh, every morning.</Text>
      <Text className="text-[13.5px] leading-5 text-white/75">
        Bread, buns, and pastries straight from your local bakery — not a warehouse batch from yesterday.
      </Text>
    </View>
  );
}
