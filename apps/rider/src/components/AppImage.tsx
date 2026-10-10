// Cached image rendering for rider photo surfaces — mirrors apps/partner and
// apps/customer's own AppImage. #24: rider screens used RN's <Image>, which has
// no disk cache, so a profile/document photo re-downloaded on every view (real
// cost on a rider's 3G connection). expo-image with cachePolicy 'memory-disk'
// fetches once and reuses it. NativeWind interop keeps existing className +
// resizeMode layouts working unchanged.
import { Image as ExpoImage, type ImageProps as ExpoImageProps, type ImageContentFit } from 'expo-image';
import { cssInterop } from 'nativewind';

cssInterop(ExpoImage, { className: 'style' });

const RESIZE_MODE_TO_CONTENT_FIT = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'scale-down',
  repeat: 'cover',
} as const satisfies Record<string, ImageContentFit>;

interface Props extends Omit<ExpoImageProps, 'contentFit'> {
  resizeMode?: keyof typeof RESIZE_MODE_TO_CONTENT_FIT;
  contentFit?: ImageContentFit;
}

export function AppImage({ resizeMode, contentFit, transition = 200, cachePolicy = 'memory-disk', recyclingKey, ...props }: Props) {
  const source = props.source;
  const uri = typeof source === 'string' ? source : source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source ? source.uri : undefined;
  return (
    <ExpoImage
      contentFit={contentFit ?? (resizeMode ? RESIZE_MODE_TO_CONTENT_FIT[resizeMode] : 'cover')}
      transition={transition}
      cachePolicy={cachePolicy}
      recyclingKey={recyclingKey ?? uri}
      {...props}
    />
  );
}
