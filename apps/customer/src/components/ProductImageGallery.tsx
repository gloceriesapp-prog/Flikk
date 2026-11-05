// A product's photos: one photo renders as a plain image; two or more become
// a horizontal pager with dots (card: up to 3 round dots; hero: one per
// photo, the active one widens). Used by
// the product card and the detail sheet's hero, so both read the same list
// (Product.imageUrls, cover first — see api/products.ts).
//
// Taps fall through to the parent Pressable (the card opens its detail
// sheet); only a horizontal drag is taken by the pager.

import { memo, useState } from 'react';
import { View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
// Gesture-handler's FlatList: on Android a plain nested horizontal list lost
// its swipe to the surrounding scroll view (detail sheet, product rows), so
// photos could not be slid; this one claims the horizontal drag.
import { FlatList } from 'react-native-gesture-handler';
import { AppImage as Image } from './AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../theme/placeholderImage';

interface Props {
  images: readonly string[];
  // 'card': up to 3 round dots bottom-left, clear of the card's ADD button.
  // 'hero': larger dots centered along the bottom.
  variant?: 'card' | 'hero';
}

const HERO_DOT = { size: 6, active: 16, gap: 4 } as const;
// Card: round dots, at most 3 shown; the window slides with the photo.
const CARD_DOTS_MAX = 3;
const CARD_DOT = 6;
// The card's frame is near-square, so 'cover' fills it cleanly. The hero is a
// wide, short strip: 'cover' blew packshots up and cropped them, so it shows
// the whole photo instead.
const FIT = { card: 'cover', hero: 'contain' } as const;

function ProductImageGalleryImpl({ images, variant = 'card' }: Props) {
  if (images.length <= 1) {
    return <Image source={{ uri: images[0] || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode={FIT[variant]} />;
  }
  // Keyed by the list so a recycled list cell showing another product starts
  // again at its first photo instead of keeping the old scroll offset.
  return <Pager key={images.join('|')} images={images} variant={variant} />;
}

function Pager({ images, variant }: Required<Props>) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  return (
    <View className="h-full w-full" onLayout={onLayout}>
      {width === 0 ? (
        <Image source={{ uri: images[0] }} className="h-full w-full" resizeMode={FIT[variant]} />
      ) : (
        <FlatList
          data={images}
          keyExtractor={(uri, i) => `${i}:${uri}`}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          // Only the visible photo and its neighbours are decoded.
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: '100%' }} resizeMode={FIT[variant]} />
          )}
        />
      )}

      <View
        pointerEvents="none"
        className={`absolute bottom-2 left-0 right-0 flex-row ${variant === 'card' ? 'justify-start pl-2' : 'justify-center'}`}
      >
        {variant === 'card' ? (
          <CardDots count={images.length} index={index} />
        ) : (
          <View
            accessibilityLabel={`Photo ${index + 1} of ${images.length}`}
            className="flex-row items-center rounded-full bg-white/80 px-1.5 py-1"
            style={{ gap: HERO_DOT.gap }}
          >
            {images.map((uri, i) => (
              <View
                key={`${i}:${uri}`}
                style={{
                  height: HERO_DOT.size,
                  width: i === index ? HERO_DOT.active : HERO_DOT.size,
                  borderRadius: HERO_DOT.size / 2,
                  backgroundColor: i === index ? '#155dfc' : 'rgba(16,28,16,0.25)',
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function cardDotWindow(count: number, index: number): number[] {
  const shown = Math.min(count, CARD_DOTS_MAX);
  const start = Math.min(Math.max(0, index - 1), count - shown);
  return Array.from({ length: shown }, (_, i) => start + i);
}

function CardDots({ count, index }: { count: number; index: number }) {
  return (
    <View accessibilityLabel={`Photo ${index + 1} of ${count}`} className="flex-row items-center" style={{ gap: 2 }}>
      {cardDotWindow(count, index).map((i) => (
        <View
          key={i}
          style={{
            height: CARD_DOT,
            width: CARD_DOT,
            borderRadius: CARD_DOT / 2,
            borderWidth: 1,
            borderColor: 'rgba(16,28,16,0.35)',
            backgroundColor: i === index ? 'rgba(16,28,16,0.55)' : '#FFFFFF',
          }}
        />
      ))}
    </View>
  );
}

export const ProductImageGallery = memo(ProductImageGalleryImpl);
