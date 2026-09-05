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
// Also where the detail sheet's "similar products" data/images get warmed
// BEFORE the tap that needs them: RN's own <Modal> fully unmounts its
// children while visible={false} (Modal.js's own _shouldShowModal — on
// Android that's a hard `props.visible === true`, no grace period), so
// ProductDetailSheet's useSimilarProducts call doesn't even exist yet at
// this point — every open used to start that fetch from zero, which is
// what made the peek-pager siblings and the "Similar products" row visibly
// pop in a beat after the sheet itself appeared. This component, by
// contrast, stays mounted for as long as the card is in the list, so
// calling the same hook (same query key => same React Query cache entry)
// here fires the request as soon as the card scrolls into view — usually
// finished well before anyone taps it. Prefetching the resulting photos
// too closes the other half of the gap: expo-image already caches the
// product's OWN photo for free (it's the exact image already on-screen in
// the grid), but the similar-products photos are ones the user hasn't
// seen yet and would otherwise still cost a real network fetch at open
// time.

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
}

export function ProductCard({ product, widthClassName, showDiscountBadge }: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const needsSimilar = !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id);
  useEffect(() => {
    if (similar.data) prefetchImages(similar.data.map((p) => p.imageUrl));
  }, [similar.data]);

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
