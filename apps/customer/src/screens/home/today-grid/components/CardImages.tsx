import { View } from 'react-native';
import { IconlyShoppingCart } from '../../../../components/icons/IconlyShoppingCart';
import { AppImage } from '../../../../components/AppImage';

// Up to two product photos (720x810), contained and bottom-aligned at one
// height; two overlap slightly side by side. No photo yet: a soft tile in
// the card's accent, so the card never shows an empty foot.
export function CardImages({ urls, width, height, accent }: { urls: string[]; width: number; height: number; accent: string }) {
  const photos = urls.slice(0, 2);
  if (!photos.length) return <PhotoPlaceholder width={width} height={height} accent={accent} />;
  const photoWidth = photos.length > 1 ? Math.round(width * 0.5) : Math.round(width * 0.62);
  return (
    <View className="flex-row items-end justify-center overflow-hidden pb-2" style={{ height }}>
      {photos.map((uri, index) => (
        <AppImage key={uri} source={{ uri }} resizeMode="contain" accessible={false}
          style={{ width: photoWidth, height: Math.max(1, Math.min(Math.round(photoWidth * 810 / 720), height - 8)), marginLeft: index ? -photoWidth * 0.18 : 0 }} />
      ))}
    </View>
  );
}

export function PhotoPlaceholder({ width, height, accent }: { width: number; height: number; accent: string }) {
  const size = Math.max(1, Math.min(Math.round(width * 0.6), height - 8));
  const tint = /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}1A` : '#F2F4F7';
  return (
    <View className="items-center justify-end pb-2" style={{ height }} testID="today-photo-placeholder">
      <View className="items-center justify-center rounded-2xl" style={{ width: size, height: size, backgroundColor: tint }}>
        <IconlyShoppingCart size={Math.round(size * 0.42)} color={/^#[0-9a-f]{6}$/i.test(accent) ? accent : '#98A2B3'} />
      </View>
    </View>
  );
}
