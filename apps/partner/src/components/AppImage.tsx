// Cached WebP/JPEG/PNG rendering shared by partner photo surfaces.
// NativeWind interop preserves existing className and resizeMode layouts.
import { Image as ExpoImage, type ImageProps as ExpoImageProps, type ImageContentFit } from 'expo-image';
import { cssInterop } from 'nativewind';

cssInterop(ExpoImage, { className: 'style' });

const RESIZE_MODE_TO_CONTENT_FIT = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'scale-down',
  // expo-image has no tiling concept — nothing in this app relies on
  // resizeMode="repeat" actually tiling, so this is the closest fit.
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

// Warms expo-image's disk/memory cache for URLs the user hasn't tapped
// into view yet — e.g. ProductCard.tsx calling this for a product's
// "similar products" photos as soon as that query resolves, well before
// the detail sheet (which is what actually renders them) ever mounts. A
// no-op for anything already cached; fire-and-forget, no loading state to
// track since nothing here is rendered directly.
export function prefetchImages(uris: (string | undefined)[]) {
  const real = uris.filter((uri): uri is string => Boolean(uri));
  if (real.length > 0) void ExpoImage.prefetch([...new Set(real)], 'memory-disk').catch(() => { /* Prefetch is optional; rendering can retry normally. */ });
}
