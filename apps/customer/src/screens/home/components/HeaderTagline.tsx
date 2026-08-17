// Brand tagline, sits between the location row and the search bar. Own file
// even though it's a couple lines — keeps CollapsibleHeaderTop focused on
// layout and collapse behavior, not copy. Second line uses lime-deep (not
// plain lime) — needs to read as text on a near-white background by the
// time this scrolls into view, not just against the header's lime top.

import { Text, View } from 'react-native';

export function HeaderTagline() {
  return (
    <View className="mt-2">
      <Text className="text-2xl font-bold leading-7 text-ink">Same-day delivery from your,</Text>
      <Text className="text-2xl font-bold leading-7">
       trusted local shops.
      </Text>
    </View>
  );
}
