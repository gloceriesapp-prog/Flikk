// A product's photos: one photo renders as a plain image; two or more become
// a horizontal pager with one dot per photo (the active one widens). Used by
// the product card and the detail sheet's hero, so both read the same list
// (Product.imageUrls, cover first — see api/products.ts).
//
// Taps fall through to the parent Pressable (the card opens its detail
// sheet); only a horizontal drag is taken by the pager.

import { memo, useState } from 'react';
import { FlatList, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { AppImage as Image } from './AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../theme/placeholderImage';

interface Props {
  images: readonly string[];
  // 'card': small dots bottom-left, clear of the card's ADD button.
  // 'hero': larger dots centered along the bottom.
  variant?: 'card' | 'hero';
}

const DOT = { card: { size: 5, active: 12, gap: 3 }, hero: { size: 6, active: 16, gap: 4 } } as const;

function ProductImageGalleryImpl({ images, variant = 'card' }: Props) {
  if (images.length <= 1) {
    return <Image source={{ uri: images[0] || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />;
  }
  // Keyed by the list so a recycled list cell showing another product starts
  // again at its first photo instead of keeping the old scroll offset.
  return <Pager key={images.join('|')} images={images} variant={variant} />;
}

function Pager({ images, variant }: Required<Props>) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const dot = DOT[variant];

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  return (
    <View className="h-full w-full" onLayout={onLayout}>
      {width === 0 ? (
        <Image source={{ uri: images[0] }} className="h-full w-full" resizeMode="cover" />
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
            <Image source={{ uri: item }} style={{ width, height: '100%' }} resizeMode="cover" />
          )}
        />
      )}

      <View
        pointerEvents="none"
        className={`absolute bottom-2 left-0 right-0 flex-row ${variant === 'card' ? 'justify-start pl-1.5' : 'justify-center'}`}
      >
        <View
          accessibilityLabel={`Photo ${index + 1} of ${images.length}`}
          className="flex-row items-center rounded-full bg-white/80 px-1.5 py-1"
          style={{ gap: dot.gap }}
        >
          {images.map((uri, i) => (
            <View
              key={`${i}:${uri}`}
              style={{
                height: dot.size,
                width: i === index ? dot.active : dot.size,
                borderRadius: dot.size / 2,
                backgroundColor: i === index ? '#155dfc' : 'rgba(16,28,16,0.25)',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export const ProductImageGallery = memo(ProductImageGalleryImpl);
