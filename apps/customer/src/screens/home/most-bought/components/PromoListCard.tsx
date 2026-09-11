// One premium promo card — a colored outer frame (the card's own
// accentColor, softened) with a solid white inner panel holding the title
// + product rows, and the "See all" footer sitting back on the colored
// frame below it. Reference: a "colored frame, white content, colored
// footer strip" layout — not a full-bleed gradient wash across the whole
// card, so the accentColor reads as a real border/frame around genuinely
// white content instead of tinting everything including the product rows.
//
// Reworked with real Flikk data instead of a fabricated gimmick (no
// ₹1-store concept exists here) — content comes from whichever real
// product feed the parent section passes in (MostBoughtSection.tsx picks
// a different slice per card so the 3 don't just repeat each other).
//
// Tapping a row opens ProductDetailSheet, same as every other product row
// in the app — one shared `openProductId` (not one state hook per row)
// since at most one sheet needs to be open from this card at a time.
//
// Header: title + a reserved image slot on the right, per an explicit
// reference image — no real per-card illustration exists yet ("I'll add
// image later"), so that slot is empty for now (a plain sized box, not a
// placeholder graphic) rather than blocking this layout on having one.
//
// Footer: plain centered "See all >>" text spanning the full width, sat
// directly on the colored frame — no separate circular arrow button
// anymore, per the same reference image.

import { useState } from 'react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { ProductDetailSheet } from '../../../../components/ProductDetailSheet/ProductDetailSheet';
import { PromoListCardRow } from './PromoListCardRow';
import type { Product } from '../../products/types';

const CARD_RADIUS = 28;
const PANEL_RADIUS = 20;

interface Props {
  title: string;
  accentColor: string;
  products: Product[];
  onSeeAll: () => void;
}

export function PromoListCard({ title, accentColor, products, onSeeAll }: Props) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const openProduct = products.find((p) => p.id === openProductId) ?? null;
  const rows = products.slice(0, 4);

  return (
    <View
      style={{ width: 288, height: 356, borderRadius: CARD_RADIUS, backgroundColor: `${accentColor}30`, padding: 8 }}
      className="shadow-lg shadow-black/10"
    >
      <View style={{ borderRadius: PANEL_RADIUS }} className="flex-1 bg-white px-4 py-5">
        <View className="flex-row items-center justify-between gap-1 border-b border-mist pb-2">
          <Text className="flex-1 text-[17px] font-semibold leading-6 tracking-tight text-ink" numberOfLines={2}>
            {title}
          </Text>
          {/* Reserved — a real per-card illustration goes here later.
              Zero footprint until then, so its absence doesn't push the
              border/rows below down with dead space. */}
          <View className="h-0 w-0" />
        </View>

        <View>
          {rows.map((product, index) => (
            <View key={product.id} className={index === 0 ? '' : 'border-t border-mist'}>
              <PromoListCardRow product={product} accentColor={accentColor} onPress={() => setOpenProductId(product.id)} />
            </View>
          ))}
        </View>
      </View>

      <Pressable onPress={onSeeAll} className="flex-row items-center justify-center gap-1.5 px-2 py-3.5">
        <Text className="text-[14px] font-semibold" style={{ color: accentColor }}>
          See all
        </Text>
        <AppIcon icon={ArrowRight02Icon} size={14} color={accentColor} strokeWidth={2.5} />
      </Pressable>

      {openProduct && (
        <ProductDetailSheet product={openProduct} visible={Boolean(openProduct)} onClose={() => setOpenProductId(null)} />
      )}
    </View>
  );
}
