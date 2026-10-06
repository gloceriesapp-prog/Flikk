import { useEffect, useState } from 'react';
import { Image as NativeImage, View } from 'react-native';
import Svg, { Defs, G, Image, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

const HEADER_IMAGE =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/fresh1.png';

export function HomeGrownHeaderImage({
  imageUrl = HEADER_IMAGE,
  aspectRatio,
  fade = true,
}: { imageUrl?: string; aspectRatio?: number; fade?: boolean } = {}) {
  const [imageHeight, setImageHeight] = useState(168);
  useEffect(() => {
    let active = true;
    if (aspectRatio) return;
    NativeImage.getSize(
      imageUrl,
      (width, height) => {
        if (active && width > 0 && height > 0) setImageHeight((176 * height) / width);
      },
      () => {
        /* Keep the existing aspect ratio if metadata cannot load. */
      },
    );
    return () => {
      active = false;
    };
  }, [imageUrl, aspectRatio]);
  const displayHeight = aspectRatio ? 176 / aspectRatio : imageHeight;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: '44%', maxWidth: 176, aspectRatio: 176 / displayHeight }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 176 ${displayHeight}`}>
        <Defs>
          <LinearGradient id="harvest-left-fade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="white" stopOpacity="0" />
            <Stop offset="0.12" stopColor="white" stopOpacity="0.35" />
            <Stop offset="0.36" stopColor="white" stopOpacity="1" />
            <Stop offset="1" stopColor="white" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="harvest-bottom-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity="1" />
            <Stop offset="0.58" stopColor="white" stopOpacity="1" />
            <Stop offset="0.76" stopColor="white" stopOpacity="0.6" />
            <Stop offset="0.9" stopColor="white" stopOpacity="0.15" />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </LinearGradient>
          <Mask
            id="harvest-left-mask"
            maskType="alpha"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="176"
            height={displayHeight}
          >
            <Rect width="176" height={displayHeight} fill="url(#harvest-left-fade)" />
          </Mask>
          <Mask
            id="harvest-bottom-mask"
            maskType="alpha"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="176"
            height={displayHeight}
          >
            <Rect width="176" height={displayHeight} fill="url(#harvest-bottom-fade)" />
          </Mask>
        </Defs>
        {/* True transparency reveals the existing sage gradient and foliage. */}
        <G mask={fade ? 'url(#harvest-bottom-mask)' : undefined}>
          <Image
            href={{ uri: imageUrl }}
            x="0"
            y="0"
            width="176"
            height={displayHeight}
            preserveAspectRatio="xMaxYMin meet"
            mask={fade ? 'url(#harvest-left-mask)' : undefined}
          />
        </G>
      </Svg>
    </View>
  );
}
