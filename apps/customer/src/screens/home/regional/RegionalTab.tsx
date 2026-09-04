// Everything shown when the "Regional" category tab is selected on Home —
// wired in from HomeScreen.tsx's RICH_SCREEN_BY_NAME map (matched
// case-insensitively against whatever an admin names this tab, same
// convention every other rich tab there already uses).
//
// This tab exists to answer one question: "does Flikk actually carry the
// local stuff, or is it just another quick-commerce app?" — so its shape
// is deliberately different from Groceries/Fresh/Bakery's flat product
// grid. A hero strip sets the tone, then rows built to tell a story (named
// local brands, loose-by-weight items, real store names + a one-line
// story each) rather than anonymous category tiles — see this folder's
// data.ts for why each row exists.
//
// Rows use ProductTeaserRow (the same shared horizontal-scroll-row
// component Bakery/Fish/etc. already use) wherever the content really is
// just products; LocalStoreRow is its own component because a store card
// (name + story, no price/ADD) isn't a product card wearing a costume.
//
// Coastal Kitchen Staples is the anchor row — real content that already
// exists elsewhere on Home (AllTabSections' own CoastalKitchenPicksSection)
// surfaced here too, not buried under "All" where a customer specifically
// looking for "the local stuff" would never find it.
//
// Every row is dummy/mock data (data.ts's own note) — no real regional-
// brand/loose-item/local-store catalog exists yet. Nothing here renders
// on an empty list (LocalStoreRow's own guard; ProductTeaserRow always
// gets a non-empty array from data.ts, same convention every other Home
// section already follows), so swapping in real data later that happens
// to be empty turns a row off cleanly instead of showing a fake one.

import { View } from 'react-native';
import { ProductTeaserRow } from '../category-tab/components/ProductTeaserRow';
import {
  COASTAL_STAPLES_PRODUCTS,
  LOCAL_BRAND_PRODUCTS,
  LOCAL_STORES,
  LOOSE_ITEM_PRODUCTS,
  REGIONAL_SNACK_PRODUCTS,
} from './data';
import { LocalStoreRow } from './LocalStoreRow';
import { RegionalHeroBanner } from './RegionalHeroBanner';

export function RegionalTab() {
  return (
    <View className="pb-32">
      <RegionalHeroBanner />

      {COASTAL_STAPLES_PRODUCTS.length > 0 && (
        <ProductTeaserRow title="Coastal Kitchen Staples" products={COASTAL_STAPLES_PRODUCTS} />
      )}

      {LOCAL_BRAND_PRODUCTS.length > 0 && (
        <ProductTeaserRow title="Local Brands You Won't Find Elsewhere" products={LOCAL_BRAND_PRODUCTS} />
      )}

      {LOOSE_ITEM_PRODUCTS.length > 0 && (
        <ProductTeaserRow title="Loose & By-Weight Items" products={LOOSE_ITEM_PRODUCTS} />
      )}

      {REGIONAL_SNACK_PRODUCTS.length > 0 && (
        <ProductTeaserRow title="Regional Sweets & Snacks" products={REGIONAL_SNACK_PRODUCTS} />
      )}

      <LocalStoreRow title="Meet Your Local Stores" stores={LOCAL_STORES} />
    </View>
  );
}
