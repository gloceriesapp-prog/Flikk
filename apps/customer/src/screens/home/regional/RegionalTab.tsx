// Everything shown when the "Regional" category tab is selected on Home —
// wired in from HomeScreen.tsx's RICH_SCREEN_BY_NAME map (matched
// case-insensitively against whatever an admin names this tab, same
// convention every other rich tab there already uses).
//
// This tab exists to answer one question: "does Flikk actually carry the
// local stuff, or is it just another quick-commerce app?" A hero strip
// sets the tone; LocalStoreRow (name + one-line story, no price/ADD — not
// a product card wearing a costume) is the trust/community-moat row.
//
// The 4 product rows this tab used to also show (Coastal Kitchen Staples/
// Local Brands/Loose Items/Regional Snacks) are gone — per an explicit
// ask to strip every product-card dummy dataset out of the app. No real
// regional-brand/loose-item catalog feed exists yet; re-add once one
// does, not with fabricated data in the meantime.

import { View } from 'react-native';
import { LOCAL_STORES } from './data';
import { LocalStoreRow } from './LocalStoreRow';
import { RegionalHeroBanner } from './RegionalHeroBanner';

export function RegionalTab() {
  return (
    <View className="pb-32">
      <RegionalHeroBanner />

      <LocalStoreRow title="Meet Your Local Stores" stores={LOCAL_STORES} />
    </View>
  );
}
