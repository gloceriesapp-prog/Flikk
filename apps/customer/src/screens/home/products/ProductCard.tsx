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

import { memo, useCallback, useEffect, useState } from 'react';
import { prefetchImages } from '../../../components/AppImage';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { useSimilarProducts } from '../../../components/ProductDetailSheet/useSimilarProducts';
import { ProductCardView } from './ProductCardView';
import { useProductAvailability } from './useProductAvailability';
import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
import type { Product } from './types';

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  compact?: boolean;
  onDark?: boolean;
  // Perf (issue #22): a parent section can compute the shared delivery
  // estimate + this product's availability ONCE (one browse-clock /
  // delivery-settings subscription for the whole row) and pass them down, so a
  // 30s clock tick re-renders the section node rather than every card. Omit
  // them and the card self-subscribes below — fine for one-off placements
  // (wishlist, cart, search) that aren't a big grid.
  estimatedMinutes?: number;
  isAvailable?: boolean;
  availabilityLabel?: string;
}

// The per-card shell: owns tap-to-open detail state + similar-product warming
// (both must survive browse-clock ticks, so they live here, above the
// memoized view). It receives the delivery estimate + availability as plain
// values and never subscribes to the clock/query itself.
const ProductCardShell = memo(function ProductCardShell({
  product,
  widthClassName,
  showDiscountBadge,
  compact,
  onDark,
  estimatedMinutes,
  isAvailable,
  availabilityLabel,
}: {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  compact?: boolean;
  onDark?: boolean;
  estimatedMinutes: number;
  isAvailable: boolean;
  availabilityLabel?: string;
}) {
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

  // Stable so the memoized ProductCardView doesn't re-render just because the
  // shell did.
  const onPress = useCallback(() => setIsDetailOpen(true), []);

  return (
    <>
      <ProductCardView
        product={product}
        widthClassName={widthClassName}
        showDiscountBadge={showDiscountBadge}
        compact={compact}
        onDark={onDark}
        onPress={onPress}
        estimatedMinutes={estimatedMinutes}
        isAvailable={isAvailable}
        availabilityLabel={availabilityLabel}
      />
      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
});

// Self-subscribing variant: one clock + delivery-settings subscription PER
// card. Used wherever a section didn't lift them (hook rules forbid calling
// these conditionally inside ProductCard, hence the separate component).
function SelfSubscribedProductCard({ product, widthClassName, showDiscountBadge, compact, onDark }: Props) {
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const availability = useProductAvailability(product);
  return (
    <ProductCardShell
      product={product}
      widthClassName={widthClassName}
      showDiscountBadge={showDiscountBadge}
      compact={compact}
      onDark={onDark}
      estimatedMinutes={estimatedMinutes}
      isAvailable={availability.isAvailable}
      availabilityLabel={availability.label}
    />
  );
}

export function ProductCard(props: Props) {
  // Lifted by a parent section → render the shell directly with no per-card
  // subscription. Otherwise self-subscribe. The branch is stable per call site
  // (a section always lifts; a one-off never does), so card state persists.
  if (props.estimatedMinutes !== undefined && props.isAvailable !== undefined) {
    return (
      <ProductCardShell
        product={props.product}
        widthClassName={props.widthClassName}
        showDiscountBadge={props.showDiscountBadge}
        compact={props.compact}
        onDark={props.onDark}
        estimatedMinutes={props.estimatedMinutes}
        isAvailable={props.isAvailable}
        availabilityLabel={props.availabilityLabel}
      />
    );
  }
  return <SelfSubscribedProductCard {...props} />;
}
