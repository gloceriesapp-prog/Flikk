import { View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';

// Up to two product photos (720x810), contained and bottom-aligned at one
// height; two overlap slightly side by side.
export function CardImages({ urls, width, height }: { urls: string[]; width: number; height: number }) {
  const photos = urls.slice(0, 2);
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
