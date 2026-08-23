// Thin wrapper around ProductCardView — owns the tap-to-open
// ProductDetailSheet state and nothing else (all the actual card UI lives
// in ProductCardView.tsx, split out specifically to avoid a require cycle;
// see that file's own note). State lives here so every screen already
// rendering ProductCard gets the detail view for free, no per-screen wiring
// needed.
//
// Tapping the card (anywhere outside the bookmark/ADD buttons, which are
// their own nested Pressables and absorb the touch first) opens
// ProductDetailSheet.

import { useState } from 'react';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { ProductCardView } from './ProductCardView';
import type { Product } from './types';

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
}

export function ProductCard({ product, widthClassName, showDiscountBadge }: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      <ProductCardView
        product={product}
        widthClassName={widthClassName}
        showDiscountBadge={showDiscountBadge}
        onPress={() => setIsDetailOpen(true)}
      />
      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
}
