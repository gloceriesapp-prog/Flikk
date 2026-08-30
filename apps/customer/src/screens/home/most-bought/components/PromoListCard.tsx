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
      style={{ width: 288, height: 300, borderRadius: CARD_RADIUS, backgroundColor: `${accentColor}30`, padding: 8 }}
      className="shadow-lg shadow-black/10"
    >
      <View style={{ borderRadius: PANEL_RADIUS }} className="flex-1 gap-3 bg-white px-4 py-4">
        <Text className="text-[15px] font-medium leading-6 tracking-tight text-ink" numberOfLines={2}>
          {title}
        </Text>

        <View>
          {rows.map((product, index) => (
            <View key={product.id} className={index === 0 ? '' : 'border-t border-mist'}>
              <PromoListCardRow product={product} accentColor={accentColor} onPress={() => setOpenProductId(product.id)} />
            </View>
          ))}
        </View>
      </View>

      <Pressable onPress={onSeeAll} className="flex-row items-center justify-between px-2 py-3">
        <Text className="text-[13px] font-medium" style={{ color: accentColor }}>
          See all
        </Text>
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: accentColor }}>
          <AppIcon icon={ArrowRight02Icon} size={15} color="#FFFFFF" strokeWidth={2} />
        </View>
      </Pressable>

      {openProduct && (
        <ProductDetailSheet product={openProduct} visible={Boolean(openProduct)} onClose={() => setOpenProductId(null)} />
      )}
    </View>
  );
}
