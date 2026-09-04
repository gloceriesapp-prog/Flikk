// Hero strip at the top of the Regional tab — sets the emotional tone
// ("local pride") before any product row, per the strategy discussion
// this tab came out of: regional/local products are this app's hardest-
// to-copy advantage, so the tab that surfaces them should say so plainly
// instead of opening straight into a product grid like every other tab.
//
// Deliberately text-only, no photo — no real "coastal Karnataka" hero
// photography exists yet, and a stock/generic image would undercut the
// exact authenticity this banner is trying to sell. Same warm terracotta
// tone the earlier Ganesh Chaturthi card used for festive/local content,
// not this app's usual blue/lavender palette — a deliberate visual cue
// that this tab is a different kind of content, not another category.

import { Text, View } from 'react-native';

export function RegionalHeroBanner() {
  return (
    <View className="mx-5 mt-4 gap-1.5 rounded-3xl px-5 py-5" style={{ backgroundColor: '#6B2E44' }}>
      <Text className="text-[19px] font-extrabold leading-6 text-white">Only here.</Text>
      <Text className="text-[13.5px] leading-5 text-white/75">
        Regional brands, loose spices, and everyday staples from your Kaup &amp; Udupi kirana stores — the stuff
        quick-commerce apps don&apos;t carry.
      </Text>
    </View>
  );
}
