// Every remote/product/store photo in this app should load through here,
// not react-native's own <Image> — expo-image gets three things RN's Image
// doesn't: a real two-tier (memory+disk) cache so a photo already seen
// doesn't re-fetch on every screen revisit (Android has no HTTP image cache
// of its own the way iOS does — this is the fix for that, not just an iOS
// nicety), a fade-in transition instead of a hard pop-in, and — once a
// product/store row actually carries one — a blurhash placeholder instead
// of a blank tile while loading.
//
// Named export aliased to `Image` at every call site
// (`import { AppImage as Image } from '.../AppImage'`), specifically so
// swapping every screen over was a mechanical import-only change — existing
// `<Image source={...} resizeMode="..." />` JSX keeps working unchanged;
// `resizeMode` is translated to expo-image's own `contentFit` prop below
// instead of touching every call site's props.
//
// cssInterop registration is required, not optional — NativeWind only
// auto-patches react-native's own host components; a third-party component
// like expo-image's Image silently ignores `className` otherwise (same
// gotcha ProductDetailSheet.tsx's own note documents for BlurView).
//
// No `blurhash` prop wired up yet — that needs a real column
// (products.blurhash / stores.blurhash) generated at upload time, which
// doesn't exist on the backend yet. `placeholder` is left as an optional
// pass-through so a screen CAN supply one today (a plain color, e.g. the
// product's own bgColor) and the real per-image blurhash can drop in later
// with no call-site changes.

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

export function AppImage({ resizeMode, contentFit, transition = 200, cachePolicy = 'memory-disk', ...props }: Props) {
  return (
    <ExpoImage
      contentFit={contentFit ?? (resizeMode ? RESIZE_MODE_TO_CONTENT_FIT[resizeMode] : 'cover')}
      transition={transition}
      cachePolicy={cachePolicy}
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
  if (real.length > 0) void ExpoImage.prefetch(real, 'memory-disk');
}
