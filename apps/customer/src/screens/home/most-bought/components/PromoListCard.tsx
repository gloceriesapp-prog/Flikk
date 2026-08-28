// One premium promo card — icon badge + title header, up to 4 product
// rows, a "See all" footer. Reference: Instamart's "₹1 Store"/"Most
// shopped near you" card row (a horizontal scroll of these). Reworked with
// real Flikk data instead of a fabricated gimmick (no ₹1-store concept
// exists here) — content comes from whichever real product feed the
// parent section passes in (MostBoughtSection.tsx picks a different slice
// per card so the 3 don't just repeat each other).
//
// Premium texture: a large, low-opacity watermark of the card's own icon
// sits behind the title (same trick fintech/premium apps use — Cred,
// Apple's own marketing cards — to keep a plain gradient from reading
// flat), plus a hairline white ring around the whole card for a glass-edge
// highlight, and a filled circular arrow button (not a flat text pill) for
// "See all" so it reads as a real tappable control, not just a label.
//
// Rounding: borderRadius set as a real numeric style (not a Tailwind
// arbitrary-value class) on both the outer clipping View AND the
// LinearGradient itself — a bracket class like rounded-[28px] on the
// wrapper alone left the bottom corners visibly square in practice.
//
// Tapping a row opens ProductDetailSheet, same as every other product row
// in the app — one shared `openProductId` (not one state hook per row)
// since at most one sheet needs to be open from this card at a time.

import { useState } from 'react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../../../components/AppIcon';
import { ProductDetailSheet } from '../../../../components/ProductDetailSheet/ProductDetailSheet';
import { colors } from '../../../../theme/tokens';
import { PromoListCardRow } from './PromoListCardRow';
import type { IconSvgElement } from '@hugeicons/react-native';
import type { Product } from '../../products/types';

const CARD_RADIUS = 28;

interface Props {
  title: string;
  icon: IconSvgElement;
  iconBg: string;
  accentColor: string;
  gradientColors: [string, string];
  products: Product[];
  onSeeAll: () => void;
}

export function PromoListCard({ title, icon, iconBg, accentColor, gradientColors, products, onSeeAll }: Props) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const openProduct = products.find((p) => p.id === openProductId) ?? null;
  // 4 rows, not 2 — the card's own fixed height (300) is a hard budget now:
  // header (~40) + rows-box + "See all" (~32) + the gaps between all three
  // has to add up to exactly that, so each row gets a real, computed height
  // (PromoListCardRow.tsx's own ROW_HEIGHT) instead of an arbitrary flex-1
  // stretch — that stretch was what left the rows box looking oversized/
  // sparse with only 2 short rows filling a tall fixed card.
  const rows = products.slice(0, 4);

  return (
    <View
      style={{ width: 288, height: 300, borderRadius: CARD_RADIUS, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' }}
      className="shadow-lg shadow-black/15"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: CARD_RADIUS, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}
      >
        {/* Oversized watermark of the card's own icon, low opacity — the
            "premium texture" that keeps the gradient from reading flat. */}
        <View className="absolute -right-4 -top-4 opacity-[0.07]" style={{ transform: [{ rotate: '18deg' }] }}>
          <AppIcon icon={icon} size={96} color={colors.ink} strokeWidth={1.4} />
        </View>

        {/* justify-between over the fixed remaining height, not a flex-1
            rows-box — the rows box now sizes to its own real content (4
            compact rows), and any slack in the card's fixed height shows up
            as breathing room between the three blocks instead of stretching
            the box itself. */}
        <View className="flex-1 justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
              <AppIcon icon={icon} size={18} color={accentColor} strokeWidth={1.8} />
            </View>
            <Text className="flex-1 text-[16px] font-semibold leading-5 text-ink" numberOfLines={2}>
              {title}
            </Text>
          </View>

          <View className="overflow-hidden rounded-2xl bg-white/70 px-3">
            {rows.map((product, index) => (
              <View key={product.id} className={index === 0 ? '' : 'border-t border-ink/5'}>
                <PromoListCardRow product={product} onPress={() => setOpenProductId(product.id)} />
              </View>
            ))}
          </View>

          <Pressable onPress={onSeeAll} className="flex-row items-center justify-between px-1">
            <Text className="text-[13px] font-semibold text-ink">See all</Text>
            <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: accentColor }}>
              <AppIcon icon={ArrowRight02Icon} size={15} color="#FFFFFF" strokeWidth={2} />
            </View>
          </Pressable>
        </View>
      </LinearGradient>

      {openProduct && (
        <ProductDetailSheet product={openProduct} visible={Boolean(openProduct)} onClose={() => setOpenProductId(null)} />
      )}
    </View>
  );
}
