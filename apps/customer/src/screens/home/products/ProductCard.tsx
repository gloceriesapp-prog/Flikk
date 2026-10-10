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
//
// Also warms the detail sheet's "similar products" data/images — but ONLY
// once this card is tapped open (isDetailOpen), never on mount. RN's <Modal>
// fully unmounts its children while visible={false}, so ProductDetailSheet's
// own useSimilarProducts doesn't exist until it opens; this hook shares the
// exact same query key, so when the sheet opens the two dedupe into one
// request and the sibling list/photos are warmed in parallel with the sheet
// mounting. Gating on isDetailOpen is deliberate: calling it unconditionally
// here made a full Home grid fire ~36 similar-product requests on one open.

import { useEffect, useState } from 'react';
import { prefetchImages } from '../../../components/AppImage';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { useSimilarProducts } from '../../../components/ProductDetailSheet/useSimilarProducts';
import { ProductCardView } from './ProductCardView';
import type { Product } from './types';

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  compact?: boolean;
  onDark?: boolean;
}

export function ProductCard({ product, widthClassName, showDiscountBadge, compact, onDark }: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Gated on isDetailOpen: this fires ONLY once the card is tapped open, not on
  // mount — a whole Home grid of cards used to each fire this on mount (~36
  // requests on one Home open). Once open, the sheet's own useSimilarProducts
  // shares this exact query key, so the two dedupe into one request and the
  // similar list still populates. prefetchImages then warms the sibling photos.
  const needsSimilar = !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id, product.storeId, isDetailOpen);
  useEffect(() => {
    if (similar.data) prefetchImages(similar.data.map((p) => p.imageUrl));
  }, [similar.data]);

  return (
    <>
      <ProductCardView
        product={product}
        widthClassName={widthClassName}
        showDiscountBadge={showDiscountBadge}
        compact={compact}
        onDark={onDark}
        onPress={() => setIsDetailOpen(true)}
      />
      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
}
